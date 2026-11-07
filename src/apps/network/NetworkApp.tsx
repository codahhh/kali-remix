import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  Cloud,
  Copy,
  Database,
  HardDrive,
  Globe2,
  Info,
  Laptop,
  Network,
  RefreshCw,
  Router,
  Server,
  Shield,
  ShieldAlert,
  Wifi,
  WifiOff,
  Radar,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useToast } from '../../state/ToastContext';
import { useOnline } from '../../hooks/useOnline';
import { Badge, Card, Segmented } from '../../components/ui/Controls';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import type { AppProps } from '../registry';
import type { TranslationKey } from '../../lib/i18n';

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

type IconType = typeof Laptop;

interface SimDevice {
  id: string;
  name: string;
  roleKey: TranslationKey;
  descKey: TranslationKey;
  address: string;
  segment: string;
  icon: IconType;
  x: number;
  y: number;
  state: 'up' | 'active';
  notes: { en: string; fr: string };
}

interface SimLink {
  from: string;
  to: string;
  label: string;
}

const DEVICES: SimDevice[] = [
  {
    id: 'wan',
    name: 'WAN-SIM',
    roleKey: 'network.external',
    descKey: 'network.device.unknown',
    address: '203.0.113.0/24',
    segment: 'simulated upstream',
    icon: Cloud,
    x: 50,
    y: 9,
    state: 'up',
    notes: {
      en: 'The simulated internet. It has no connection to your real network.',
      fr: 'L’Internet simulé. Aucun lien avec votre réseau réel.',
    },
  },
  {
    id: 'fw',
    name: 'FW-EDGE',
    roleKey: 'network.device.fw',
    descKey: 'network.device.fwDesc',
    address: '10.0.42.1',
    segment: 'lab-edge',
    icon: Shield,
    x: 50,
    y: 27,
    state: 'active',
    notes: {
      en: 'Default-deny policy with an allow-list: HTTPS in, DNS out, no direct database access.',
      fr: 'Politique de refus par défaut avec liste blanche : HTTPS entrant, DNS sortant, aucun accès direct à la base.',
    },
  },
  {
    id: 'gw',
    name: 'GW-SIM',
    roleKey: 'network.device.gw',
    descKey: 'network.device.gwDesc',
    address: '10.0.42.1',
    segment: 'office / lab',
    icon: Router,
    x: 50,
    y: 45,
    state: 'active',
    notes: {
      en: 'Fictional router separating the office VLAN (10.0.42.0/24) from the isolated database segment.',
      fr: 'Routeur fictif séparant le VLAN bureau (10.0.42.0/24) du segment isolé de la base.',
    },
  },
  {
    id: 'ws',
    name: 'WS-01',
    roleKey: 'network.device.ws',
    descKey: 'network.device.wsDesc',
    address: '10.0.42.15',
    segment: 'office',
    icon: Laptop,
    x: 13,
    y: 72,
    state: 'active',
    notes: {
      en: 'Analyst workstation. Starts the simulated request; nothing is actually transmitted.',
      fr: 'Poste de l’analyste. Lance la requête simulée ; rien n’est réellement transmis.',
    },
  },
  {
    id: 'mon',
    name: 'SENSOR-01',
    roleKey: 'network.device.mon',
    descKey: 'network.device.monDesc',
    address: '10.0.42.30',
    segment: 'office',
    icon: Radar,
    x: 37,
    y: 72,
    state: 'up',
    notes: {
      en: 'Collects fictional flow records and logs for the lab. Every alert shown is invented.',
      fr: 'Collecte des enregistrements de flux et journaux fictifs. Toute alerte affichée est inventée.',
    },
  },
  {
    id: 'dns',
    name: 'DNS-01',
    roleKey: 'network.device.dns',
    descKey: 'network.device.dnsDesc',
    address: '10.0.42.10',
    segment: 'office',
    icon: Globe2,
    x: 61,
    y: 72,
    state: 'up',
    notes: {
      en: 'Resolves fictional names such as web.lab.local. No DNS query is performed by this app.',
      fr: 'Résout des noms fictifs comme web.lab.local. Aucune requête DNS n’est effectuée par cette application.',
    },
  },
  {
    id: 'files',
    name: 'FILES-01',
    roleKey: 'network.device.file',
    descKey: 'network.device.fileDesc',
    address: '10.0.42.40',
    segment: 'office',
    icon: HardDrive,
    x: 86,
    y: 72,
    state: 'up',
    notes: {
      en: 'Fictional SMB share. In a real network you would restrict SMB to the office segment.',
      fr: 'Partage SMB fictif. Sur un vrai réseau, SMB serait limité au segment bureau.',
    },
  },
  {
    id: 'web',
    name: 'WEB-01',
    roleKey: 'network.device.web',
    descKey: 'network.device.webDesc',
    address: '10.0.42.20',
    segment: 'lab',
    icon: Server,
    x: 28,
    y: 91,
    state: 'up',
    notes: {
      en: 'Serves the fictional internal report portal over HTTPS. Least privilege applies to its service account.',
      fr: 'Sert le portail de rapports interne fictif en HTTPS. Le moindre privilège s’applique à son compte de service.',
    },
  },
  {
    id: 'db',
    name: 'DB-01',
    roleKey: 'network.device.db',
    descKey: 'network.device.dbDesc',
    address: '10.0.42.50',
    segment: 'data',
    icon: Database,
    x: 72,
    y: 91,
    state: 'up',
    notes: {
      en: 'Fictional PostgreSQL instance on an isolated segment. Only WEB-01 may reach it, and only on 5432.',
      fr: 'Instance PostgreSQL fictive sur un segment isolé. Seul WEB-01 peut l’atteindre, et uniquement sur 5432.',
    },
  },
];

const LINKS: SimLink[] = [
  { from: 'wan', to: 'fw', label: 'HTTPS 443' },
  { from: 'fw', to: 'gw', label: 'routed' },
  { from: 'gw', to: 'ws', label: 'VLAN office' },
  { from: 'gw', to: 'mon', label: 'mirror' },
  { from: 'gw', to: 'dns', label: 'DNS 53' },
  { from: 'gw', to: 'files', label: 'SMB 445' },
  { from: 'gw', to: 'web', label: 'HTTPS 443' },
  { from: 'web', to: 'db', label: '5432 (allow-list)' },
];

const REQUEST_PATH = ['ws', 'gw', 'fw', 'web', 'db', 'web', 'gw', 'ws'];

const FLOW_LABELS: Record<string, string> = {
  'ws>gw': 'GET /reports/weekly',
  'gw>fw': 'route lookup (simulated)',
  'fw>web': 'HTTPS allowed',
  'web>db': 'SELECT weekly_report',
  'db>web': '200 OK (fictional)',
  'web>fw': 'HTTPS response',
  'fw>gw': 'return path',
  'gw>ws': 'rendered page (simulated)',
};

function deviceById(id: string): SimDevice | undefined {
  return DEVICES.find((device) => device.id === id);
}

function readNetworkInformation(): NetworkInformation | null {
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  if (nav.connection) return nav.connection;
  const legacy = navigator as Navigator & { mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation };
  return legacy.mozConnection ?? legacy.webkitConnection ?? null;
}

function browserLabel(): string {
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chromium';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

export function NetworkApp(_props: AppProps): ReactNode {
  const { t, lang } = usePreferences();
  const { push } = useToast();
  const online = useOnline();
  const [tab, setTab] = useState<'real' | 'sim'>('real');
  const [selectedId, setSelectedId] = useState('web');
  const [flows, setFlows] = useState<Array<{ id: number; text: string }>>([]);
  const [running, setRunning] = useState(false);
  const [hopIndex, setHopIndex] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const counter = useRef(0);
  const netInfo = useMemo(() => (tick >= 0 ? readNetworkInformation() : null), [tick]);

  const selected = deviceById(selectedId) ?? DEVICES[0];
  const selectedIcon = selected?.icon ?? Server;
  const SelectedIcon = selectedIcon;

  useEffect(() => {
    if (!running) return;
    if (hopIndex === null || hopIndex >= REQUEST_PATH.length - 1) {
      setRunning(false);
      if (hopIndex !== null) push(t('network.flowDone'), 'success');
      return;
    }
    const timer = window.setTimeout(() => {
      const from = REQUEST_PATH[hopIndex] ?? 'ws';
      const to = REQUEST_PATH[hopIndex + 1] ?? 'gw';
      const fromDevice = deviceById(from);
      const toDevice = deviceById(to);
      counter.current += 1;
      setFlows((list) =>
        [
          ...list,
          {
            id: counter.current,
            text: t('network.flowStep', {
              from: fromDevice?.name ?? from,
              to: toDevice?.name ?? to,
              label: FLOW_LABELS[`${from}>${to}`] ?? 'simulated',
            }),
          },
        ].slice(-12),
      );
      setHopIndex((index) => (index === null ? 0 : index + 1));
    }, 720);
    return () => window.clearTimeout(timer);
  }, [hopIndex, push, running, t]);

  const startFlow = (): void => {
    setFlows([]);
    setHopIndex(0);
    setRunning(true);
    push(t('network.flowRunning'), 'info');
  };

  const copyInfo = async (): Promise<void> => {
    const info = {
      online,
      effectiveType: netInfo?.effectiveType ?? 'not reported',
      downlinkMbps: netInfo?.downlink ?? 'not reported',
      rttMs: netInfo?.rtt ?? 'not reported',
      saveData: netInfo?.saveData ?? 'not reported',
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform || 'not reported',
      userAgent: navigator.userAgent,
      note: 'Only values exposed by this browser. KALI WEB OS performs no network probes.',
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      push(t('network.copied'), 'success');
    } catch {
      push(t('terminal.copyFailed'), 'error');
    }
  };

  const activeHopDevice = hopIndex !== null ? REQUEST_PATH[hopIndex] : null;

  const infoCards: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: t('network.online'),
      value: online ? t('network.online') : t('network.offline'),
      hint: 'navigator.onLine',
    },
    {
      label: t('network.effectiveType'),
      value: netInfo?.effectiveType ?? t('network.notReported'),
      hint: 'navigator.connection.effectiveType',
    },
    {
      label: t('network.downlink'),
      value:
        typeof netInfo?.downlink === 'number'
          ? `${netInfo.downlink} Mb/s`
          : t('network.notReported'),
      hint: 'navigator.connection.downlink',
    },
    {
      label: t('network.rtt'),
      value: typeof netInfo?.rtt === 'number' ? `${netInfo.rtt} ms` : t('network.notReported'),
      hint: 'navigator.connection.rtt',
    },
    {
      label: t('network.saveData'),
      value:
        typeof netInfo?.saveData === 'boolean'
          ? netInfo.saveData
            ? t('common.yes')
            : t('common.no')
          : t('network.notReported'),
      hint: 'navigator.connection.saveData',
    },
    {
      label: t('network.browser'),
      value: browserLabel(),
      hint: 'user agent',
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-1/20">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-surface-line bg-gradient-to-r from-sky-400/[0.07] via-transparent to-transparent px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/15 text-sky-300">
          <Network className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold text-text-hi">{t('network.title')}</h2>
          <p className="truncate text-[10px] text-text-low">{t('network.subtitle')}</p>
        </div>
        <Badge tone={online ? 'success' : 'warning'}>
          {online ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
          {online ? t('network.online') : t('network.offline')}
        </Badge>
        <div className="lg:hidden">
          <Segmented
            value={tab}
            onChange={setTab}
            ariaLabel={t('network.title')}
            options={[
              { value: 'real', label: t('network.tabReal') },
              { value: 'sim', label: t('network.tabSim') },
            ]}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto kali-scroll">
        <div className="mx-auto grid w-full max-w-6xl gap-3 p-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className={tab === 'real' ? 'space-y-3' : 'hidden space-y-3 lg:block'}>
            <section className="rounded-xl border border-surface-line bg-surface-win/55">
              <div className="flex items-center justify-between gap-2 border-b border-surface-line px-3 py-2">
                <h3 className="text-[12px] font-semibold text-text-hi">
                  {t('network.browserInfo')}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTick((value) => value + 1)}
                    aria-label={t('network.reload')}
                    title={t('network.reload')}
                    className="grid h-7 w-7 place-items-center rounded-md text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyInfo()}
                    aria-label={t('network.copyInfo')}
                    title={t('network.copyInfo')}
                    className="grid h-7 w-7 place-items-center rounded-md text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <dl className="divide-y divide-surface-line/60">
                {infoCards.map((card) => (
                  <div key={card.label} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <dt className="min-w-0">
                      <span className="block truncate text-[11px] text-text-mid">{card.label}</span>
                      {card.hint ? (
                        <span className="block truncate font-mono text-[9px] text-text-low/70">
                          {card.hint}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="shrink-0 text-right text-[11px] font-medium text-text-hi">
                      {card.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {!netInfo ? (
                <p className="border-t border-surface-line px-3 py-2 text-[10px] leading-relaxed text-amber-300/90">
                  {t('network.noConnectionApi')}
                </p>
              ) : null}
            </section>

            <Card className="border-amber-400/25 bg-amber-400/[0.05]">
              <h3 className="flex items-center gap-2 text-[12px] font-semibold text-amber-200">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                {t('network.limitations')}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-mid">
                {t('network.limitationsBody')}
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-text-mid">
                {[
                  t('network.limitLan'),
                  t('network.limitPorts'),
                  t('network.limitPing'),
                  t('network.limitIp'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-amber-400/20 pt-2 text-[10px] leading-relaxed text-text-low">
                {t('network.noScan')}
              </p>
            </Card>

            <Card>
              <h3 className="flex items-center gap-2 text-[12px] font-semibold text-text-hi">
                <Info className="h-4 w-4 text-accented" aria-hidden="true" />
                {t('network.canDo')}
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-mid">
                {t('network.canDoBody')}
              </p>
              <div className="mt-2 rounded-lg border border-surface-line bg-ink-0/40 p-2">
                <p className="text-[9px] uppercase tracking-wider text-text-low">
                  {t('network.userAgent')}
                </p>
                <p className="mt-1 break-all font-mono text-[9.5px] leading-relaxed text-text-mid">
                  {navigator.userAgent}
                </p>
                <p className="mt-1 text-[9px] text-text-low">{t('network.userAgentNote')}</p>
              </div>
            </Card>

            <Card className="border-surface-line bg-transparent">
              <p className="flex items-start gap-2 text-[10px] leading-relaxed text-text-low">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {t('network.publicIpHidden')}
              </p>
            </Card>
          </div>

          <div className={tab === 'sim' ? 'space-y-3' : 'hidden space-y-3 lg:block'}>
            <section className="rounded-xl border border-surface-line bg-surface-win/55">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-line px-3 py-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[12px] font-semibold text-text-hi">
                    {t('network.topology')}
                  </h3>
                  <Badge tone="sim">{t('common.simulated')}</Badge>
                </div>
                <span className="text-[10px] text-text-low">
                  {t('network.devices', { count: DEVICES.length })}
                </span>
              </div>

              <div className="relative mx-auto aspect-[4/3] min-h-[300px] w-full max-w-3xl p-2 sm:aspect-[16/9] sm:min-h-0">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="net-link" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgb(var(--accent) / 0.15)" />
                      <stop offset="50%" stopColor="rgb(var(--accent) / 0.55)" />
                      <stop offset="100%" stopColor="rgb(var(--accent) / 0.15)" />
                    </linearGradient>
                  </defs>
                  {LINKS.map((link) => {
                    const from = deviceById(link.from);
                    const to = deviceById(link.to);
                    if (!from || !to) return null;
                    const active =
                      running &&
                      activeHopDevice !== null &&
                      (link.from === activeHopDevice || link.to === activeHopDevice);
                    return (
                      <line
                        key={`${link.from}-${link.to}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={active ? 'rgb(var(--accent-2) / 0.85)' : 'url(#net-link)'}
                        strokeWidth={active ? 0.7 : 0.3}
                        strokeDasharray={active ? '2 2' : undefined}
                        className={active ? 'animate-dash' : undefined}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </svg>

                {DEVICES.map((device) => {
                  const Icon = device.icon;
                  const active = selectedId === device.id;
                  const hopping = running && activeHopDevice === device.id;
                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => setSelectedId(device.id)}
                      aria-pressed={active}
                      aria-label={`${device.name} — ${t(device.roleKey)}`}
                      style={{ left: `${device.x}%`, top: `${device.y}%` }}
                      className={[
                        'absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-all duration-200 focus-ring',
                        'w-[72px] sm:w-[96px]',
                        active
                          ? 'z-10 border-accent/60 bg-accent/15 shadow-glow'
                          : 'border-white/10 bg-surface-win/85 hover:border-accent/35 hover:bg-surface-hover',
                        hopping ? 'scale-105 border-cyan-300/80 shadow-[0_0_24px_rgb(var(--accent-2)/0.35)]' : '',
                      ].join(' ')}
                    >
                      <Icon
                        className={[
                          'mx-auto h-4 w-4',
                          device.id === 'wan'
                            ? 'text-violet-300'
                            : device.id === 'fw'
                              ? 'text-emerald-300'
                              : device.id === 'db'
                                ? 'text-amber-300'
                                : 'text-accented',
                        ].join(' ')}
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      <span className="mt-0.5 block truncate text-[9px] font-semibold text-text-hi">
                        {device.name}
                      </span>
                      <span className="block truncate font-mono text-[8px] text-text-low">
                        {device.address}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-surface-line px-3 py-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Activity />}
                  onClick={startFlow}
                  disabled={running}
                >
                  {running ? t('network.flowRunning') : t('network.runFlow')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFlows([]);
                    setHopIndex(null);
                    setRunning(false);
                  }}
                >
                  {t('network.clearFlows')}
                </Button>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-text-low">
                  <Shield className="h-3 w-3 text-emerald-400/80" aria-hidden="true" />
                  {t('network.noRealTraffic')}
                </span>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-surface-win/55">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accented">
                    <SelectedIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-text-hi">{selected?.name}</p>
                    <p className="truncate text-[10px] text-text-low">
                      {selected ? t(selected.roleKey) : ''}
                    </p>
                  </div>
                  <Badge tone="sim" className="ml-auto">
                    {t('common.simulated')}
                  </Badge>
                </div>
                <dl className="mt-2 space-y-1 text-[10.5px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-low">{t('network.address')}</dt>
                    <dd className="font-mono text-text-mid">{selected?.address}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-low">{t('network.segment')}</dt>
                    <dd className="font-mono text-text-mid">{selected?.segment}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-text-low">{t('network.state')}</dt>
                    <dd className="text-emerald-300">{t('network.up')}</dd>
                  </div>
                </dl>
                <p className="mt-2 border-t border-surface-line pt-2 text-[10.5px] leading-relaxed text-text-mid">
                  {selected ? selected.notes[lang] : ''}
                </p>
              </Card>

              <Card className="bg-surface-win/55">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[12px] font-semibold text-text-hi">
                    {t('network.flowLog')}
                  </h3>
                  <Badge tone="neutral">{t('common.simulated')}</Badge>
                </div>
                {flows.length === 0 ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-text-low">
                    {t('network.noFlows')}
                  </p>
                ) : (
                  <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[10px] leading-relaxed text-text-mid kali-scroll">
                    {flows.map((flow) => (
                      <li key={flow.id} className="flex gap-1.5">
                        <span className="text-text-low">
                          {String(flow.id).padStart(2, '0')}
                        </span>
                        <span className="break-all">{flow.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-2 flex items-center gap-2 border-t border-surface-line pt-2 text-[9px] text-text-low">
                  <Logo className="h-3.5 w-3.5" />
                  {t('network.realTip')}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
