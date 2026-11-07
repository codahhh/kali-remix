import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Info,
  MemoryStick,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useFs } from '../../state/FsContext';
import { useWindows } from '../../state/WindowContext';
import { useOnline } from '../../hooks/useOnline';
import { usePwaContext } from '../../state/PwaContext';
import { useNow } from '../../hooks/useNow';
import { humanSize } from '../../lib/fs';
import { Badge, ProgressBar, Segmented } from '../../components/ui/Controls';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { humanFileSize } from '../files/fileIcons';
import type { AppProps } from '../registry';

interface StorageInfo {
  supported: boolean;
  usage: number;
  quota: number;
  persisted: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
}

interface ServiceRow {
  pid: number;
  name: string;
  state: 'running' | 'sleeping';
  cpu: number;
  mem: number;
  weight: number;
}

const SIM_SERVICES: Array<Omit<ServiceRow, 'cpu' | 'mem'> & { weight: number }> = [
  { pid: 812, name: 'systemd-logind (sim)', state: 'running', weight: 1.1 },
  { pid: 1042, name: 'kali-shell (sim)', state: 'running', weight: 2.4 },
  { pid: 1105, name: 'files-service (sim)', state: 'running', weight: 1.6 },
  { pid: 1210, name: 'cyber-lab (sim)', state: 'sleeping', weight: 0.7 },
  { pid: 1333, name: 'net-sim (sim)', state: 'sleeping', weight: 0.5 },
  { pid: 1444, name: 'xfce-panel (sim)', state: 'running', weight: 0.9 },
  { pid: 1520, name: 'log-sensor (sim)', state: 'running', weight: 0.6 },
];

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function MonitorApp(_props: AppProps): ReactNode {
  const { t, locale } = usePreferences();
  const { stats, tree, lastSavedAt, memoryOnly } = useFs();
  const { windows } = useWindows();
  const online = useOnline();
  const pwa = usePwaContext();
  const now = useNow(1000);
  const [tab, setTab] = useState<'overview' | 'services'>('overview');
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [persistBusy, setPersistBusy] = useState(false);
  const [, setTick] = useState(0);
  const [history, setHistory] = useState<Array<{ cpu: number; ram: number }>>([]);
  const heap = useMemo(() => {
    const perf = performance as Performance & { memory?: MemoryInfo };
    return perf.memory ?? null;
  }, []);
  const startedAt = useRef(Date.now());
  const [services, setServices] = useState<ServiceRow[]>(() =>
    SIM_SERVICES.map((service) => ({ ...service, cpu: 0, mem: 0 })),
  );

  const readStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        let persisted = false;
        try {
          persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        } catch {
          persisted = false;
        }
        setStorage({
          supported: true,
          usage: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
          persisted,
        });
      } else {
        setStorage({ supported: false, usage: 0, quota: 0, persisted: false });
      }
    } catch {
      setStorage({ supported: false, usage: 0, quota: 0, persisted: false });
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    void readStorage();
  }, [readStorage]);

  // Simulated metrics ticker (explicitly fictional, labelled in the UI).
  useEffect(() => {
    const update = (): void => {
      setTick((value) => {
        const next = value + 1;
        const seconds = next * 1.6;
        const cpu = Math.round(
          clamp(14 + 9 * Math.sin(seconds / 7) + 5 * Math.sin(seconds / 2.3) + noise(next) * 9, 3, 82),
        );
        const ram = Math.round(
          clamp(41 + 6 * Math.sin(seconds / 15) + noise(next + 100) * 4, 22, 88),
        );
        setHistory((list) => [...list, { cpu, ram }].slice(-48));
        setServices(
          SIM_SERVICES.map((service, index) => ({
            ...service,
            cpu: Math.round(cpu * service.weight * (0.55 + noise(next * 3 + index) * 0.5) * 10) / 10,
            mem: Math.round(ram * service.weight * 0.16 * 10) / 10,
          })),
        );
        return next;
      });
    };
    update();
    const timer = window.setInterval(update, 1600);
    return () => window.clearInterval(timer);
  }, []);

  const requestPersistence = async (): Promise<void> => {
    if (!navigator.storage?.persist) return;
    setPersistBusy(true);
    try {
      const granted = await navigator.storage.persist();
      setStorage((current) => (current ? { ...current, persisted: granted } : current));
      await readStorage();
    } catch {
      /* ignore */
    } finally {
      setPersistBusy(false);
    }
  };

  const latest = history[history.length - 1] ?? { cpu: 0, ram: 0 };
  const usagePct =
    storage && storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;
  const uptimeSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.current) / 1000));
  const uptimeText = `${String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0')}:${String(
    Math.floor((uptimeSeconds % 3600) / 60),
  ).padStart(2, '0')}:${String(uptimeSeconds % 60).padStart(2, '0')}`;
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-1/20">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-line bg-gradient-to-r from-violet-400/[0.08] via-transparent to-transparent px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-400/15 text-violet-300">
          <Activity className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold text-text-hi">{t('monitor.title')}</h2>
          <p className="truncate text-[10px] text-text-low">{t('monitor.subtitle')}</p>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          ariaLabel={t('monitor.title')}
          size="sm"
          options={[
            { value: 'overview', label: t('monitor.tabOverview') },
            { value: 'services', label: t('monitor.tabServices') },
          ]}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw />}
          onClick={() => {
            void readStorage();
            setTick((value) => value + 1);
          }}
        >
          <span className="hidden sm:inline">{t('monitor.refresh')}</span>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto kali-scroll">
        <div className="mx-auto w-full max-w-4xl space-y-3 p-3">
          {tab === 'overview' ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <StatCard
                  icon={<Cpu />}
                  label={t('monitor.cpu')}
                  value={`${latest.cpu}%`}
                  badge={t('monitor.simBadge')}
                  tone="sim"
                />
                <StatCard
                  icon={<MemoryStick />}
                  label={t('monitor.ram')}
                  value={`${latest.ram}%`}
                  badge={t('monitor.simBadge')}
                  tone="sim"
                />
                <StatCard
                  icon={<HardDrive />}
                  label={t('monitor.storageUsed')}
                  value={storage?.supported ? humanSize(storage.usage) : '—'}
                  badge={t('monitor.real')}
                  tone="real"
                />
              </div>

              <section className="rounded-xl border border-violet-400/25 bg-violet-400/[0.05] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[12.5px] font-semibold text-text-hi">{t('monitor.history')}</h3>
                  <Badge tone="sim">{t('monitor.simBadge')}</Badge>
                  <span className="ml-auto text-[10px] text-text-low">
                    {t('monitor.updated', { time: timeFormatter.format(now) })}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Sparkline
                    values={history.map((point) => point.cpu)}
                    label={t('monitor.cpu')}
                    color="rgb(var(--accent-2))"
                    suffix="%"
                  />
                  <Sparkline
                    values={history.map((point) => point.ram)}
                    label={t('monitor.ram')}
                    color="rgb(167 139 250)"
                    suffix="%"
                  />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-text-low">
                  {t('monitor.simNote')} {t('monitor.limitHint')}
                </p>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
                  <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-text-hi">
                    <HardDrive className="h-4 w-4 text-accented" aria-hidden="true" />
                    {t('monitor.storage')}
                    <Badge tone="success" className="ml-auto">
                      {t('monitor.real')}
                    </Badge>
                  </h3>
                  {storageLoading ? (
                    <p className="mt-2 text-[11px] text-text-low">{t('monitor.storageLoading')}</p>
                  ) : storage?.supported ? (
                    <>
                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-lg font-semibold tabular-nums text-text-hi">
                          {humanSize(storage.usage)}
                        </span>
                        <span className="text-[10px] text-text-low">
                          {t('monitor.storageQuota')}: {humanSize(storage.quota)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={usagePct} label={t('monitor.storage')} />
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-text-low">
                        {t('monitor.storageNote')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-surface-line pt-2">
                        <span className="text-[10px] text-text-low">
                          {t('monitor.persistence')}:
                        </span>
                        <Badge tone={storage.persisted ? 'success' : 'warning'}>
                          {storage.persisted ? t('monitor.persisted') : t('monitor.notPersisted')}
                        </Badge>
                        {!storage.persisted ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={persistBusy}
                            onClick={() => void requestPersistence()}
                          >
                            {t('monitor.requestPersistence')}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-[11px] text-amber-300/90">
                      {t('monitor.storageSupported')}
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
                  <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-text-hi">
                    <Database className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    {t('monitor.fs')}
                    <Badge tone="success" className="ml-auto">
                      {t('monitor.real')}
                    </Badge>
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <Metric label={t('monitor.fsFiles')} value={String(stats.files)} />
                    <Metric label={t('monitor.fsDirs')} value={String(stats.dirs)} />
                    <Metric label={t('monitor.fsBytes')} value={humanFileSize(stats.bytes)} />
                    <Metric label={t('monitor.fsNodes')} value={String(stats.nodes)} />
                  </dl>
                  <p className="mt-2 text-[10px] text-text-low">
                    IndexedDB · {t('files.infoHint')}
                  </p>
                  {lastSavedAt ? (
                    <p className="mt-1 text-[10px] text-text-low">
                      {t('editor.savedAt', { time: timeFormatter.format(new Date(lastSavedAt)) })}
                    </p>
                  ) : null}
                  {memoryOnly ? (
                    <p className="mt-1 text-[10px] text-amber-300">{t('toast.fsError')}</p>
                  ) : null}
                </section>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
                  <h3 className="text-[12.5px] font-semibold text-text-hi">{t('monitor.pwa')}</h3>
                  <dl className="mt-2 space-y-1.5 text-[11px]">
                    <Row
                      label={t('monitor.installed')}
                      value={pwa.installed ? t('common.yes') : t('monitor.browserTab')}
                    />
                    <Row label={t('monitor.sw')} value={pwa.swState === 'active' ? t('monitor.swActive') : t('monitor.swNone')} />
                    <Row label={t('monitor.network')} value={online ? t('desktop.online') : t('desktop.offline')} />
                    <Row
                      label={t('monitor.visibility')}
                      value={document.visibilityState === 'visible' ? t('monitor.visible') : t('monitor.hidden')}
                    />
                    <Row label={t('monitor.uptime')} value={uptimeText} mono />
                    <Row label={t('monitor.windows')} value={String(windows.length)} />
                  </dl>
                </section>

                <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
                  <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-text-hi">
                    <Info className="h-4 w-4 text-accented" aria-hidden="true" />
                    {t('monitor.usageTitle')}
                  </h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-text-mid">
                    {t('monitor.usageBody')}
                  </p>
                  <div className="mt-2 space-y-1.5 border-t border-surface-line pt-2 text-[10px]">
                    <Row
                      label={t('monitor.memory')}
                      value={
                        heap
                          ? `${humanSize(heap.usedJSHeapSize)} / ${humanSize(heap.jsHeapSizeLimit)}`
                          : t('monitor.memoryUnavailable')
                      }
                    />
                    <Row label={t('monitor.sessionStart')} value={timeFormatter.format(new Date(startedAt.current))} mono />
                    <Row label={t('monitor.diskFree')} value={t('monitor.simDisk')} />
                    <Row
                      label={t('monitor.terminalBuffer')}
                      value={t('common.simulated')}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[9.5px] text-text-low">
                    <ShieldCheck className="h-3 w-3 text-emerald-400/80" aria-hidden="true" />
                    {t('desktop.simBadge')}
                  </p>
                </section>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-line bg-surface-soft/40 px-3 py-2 text-[10px] text-text-low">
                <Wifi className="h-3.5 w-3.5 text-accented" aria-hidden="true" />
                {online ? t('desktop.online') : t('desktop.offline')}
                <span className="text-text-low/50">·</span>
                {t('desktop.version')}
                <span className="text-text-low/50">·</span>
                <Logo className="h-3 w-3" />
                KALI WEB OS
                <span className="ml-auto">
                  {tree['/etc/os-release'] ? '/etc/os-release (simulated)' : ''}
                </span>
              </div>
            </>
          ) : (
            <section className="rounded-xl border border-surface-line bg-surface-win/55">
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-line px-3 py-2">
                <ServerCog className="h-4 w-4 text-accented" aria-hidden="true" />
                <h3 className="text-[12.5px] font-semibold text-text-hi">{t('monitor.processes')}</h3>
                <Badge tone="sim">{t('monitor.simBadge')}</Badge>
                <span className="ml-auto text-[10px] text-text-low">
                  {t('monitor.updated', { time: timeFormatter.format(now) })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] text-left text-[11px]">
                  <thead className="bg-surface-soft/50 text-[9.5px] uppercase tracking-wider text-text-low">
                    <tr>
                      <th scope="col" className="px-3 py-1.5 font-medium">{t('monitor.pid')}</th>
                      <th scope="col" className="px-3 py-1.5 font-medium">{t('monitor.service')}</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{t('monitor.cpuAbbr')} %</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{t('monitor.ramAbbr')} %</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-medium">{t('monitor.state')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.pid} className="border-t border-surface-line/60">
                        <td className="px-3 py-1.5 font-mono text-text-low">{service.pid}</td>
                        <td className="px-3 py-1.5 text-text-hi">{service.name}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-mid">
                          {service.cpu.toFixed(1)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-mid">
                          {service.mem.toFixed(1)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span
                            className={
                              service.state === 'running' ? 'text-emerald-300' : 'text-text-low'
                            }
                          >
                            {service.state === 'running' ? t('monitor.running') : t('monitor.sleeping')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-surface-line px-3 py-2 text-[10px] leading-relaxed text-text-low">
                {t('monitor.simNote')}
              </p>
            </section>
          )}

          <p className="pb-1 text-center text-[10px] text-text-low">{t('desktop.simBadge')}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  badge,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  badge: string;
  tone: 'sim' | 'real';
}): ReactNode {
  return (
    <div className="rounded-xl border border-surface-line bg-surface-win/55 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-soft text-accented [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
        <span className="truncate text-[11px] text-text-mid">{label}</span>
        <Badge tone={tone === 'sim' ? 'sim' : 'success'} className="ml-auto shrink-0">
          {badge}
        </Badge>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-text-hi">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rounded-lg border border-surface-line bg-surface-soft/50 px-2 py-1.5">
      <dt className="text-[9.5px] uppercase tracking-wider text-text-low">{label}</dt>
      <dd className="mt-0.5 font-mono text-[12px] text-text-hi">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): ReactNode {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="shrink-0 text-text-low">{label}</dt>
      <dd className={`text-right text-text-mid ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</dd>
    </div>
  );
}

function Sparkline({
  values,
  label,
  color,
  suffix,
}: {
  values: number[];
  label: string;
  color: string;
  suffix: string;
}): ReactNode {
  const width = 200;
  const height = 48;
  const points = values.length > 1 ? values : [0, 0];
  const path = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - (clamp(value, 0, 100) / 100) * (height - 6) - 3;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const latest = points[points.length - 1] ?? 0;
  const id = `spark-${label.replace(/\s+/g, '-')}`;
  return (
    <div className="rounded-lg border border-surface-line bg-ink-0/40 px-2 py-1.5">
      <div className="flex items-center justify-between text-[10px] text-text-low">
        <span>{label}</span>
        <span className="font-mono tabular-nums text-text-mid">
          {Math.round(latest)}
          {suffix}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-12 w-full" role="img" aria-label={`${label} sparkline`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={`url(#${id})`}
          stroke="none"
        />
        <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
