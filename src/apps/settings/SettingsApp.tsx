import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Info,
  Moon,
  Palette,
  Settings as SettingsIcon,
  Smartphone,
  Sun,
  Terminal,
  Trash2,
  Upload,
  Database,
  Sparkles,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useFs } from '../../state/FsContext';
import { useToast } from '../../state/ToastContext';
import { useWindows } from '../../state/WindowContext';
import { usePwaContext } from '../../state/PwaContext';
import {
  ACCENTS,
  TERMINAL_FONT_SIZES,
  WALLPAPERS,
} from '../../lib/prefs';
import { parseImportedTree, serializeTree } from '../../lib/fs';
import { clearLabProgress } from '../lab/useLabProgress';
import { languageNames } from '../../lib/i18n';
import type { AccentId, Lang, ThemeMode, WallpaperId } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Badge, RangeField, Segmented, SettingRow, Toggle } from '../../components/ui/Controls';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InstallDialog } from '../../components/InstallDialog';
import { Spinner } from '../../components/ui/Feedback';
import { humanFileSize } from '../files/fileIcons';
import type { AppProps } from '../registry';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export function SettingsApp(_props: AppProps): ReactNode {
  const { prefs, setPref, resetPreferences, t, lang, locale } = usePreferences();
  const { status, stats, tree, replaceTree, resetTree, memoryOnly } = useFs();
  const { resetSession } = useWindows();
  const { push } = useToast();
  const pwa = usePwaContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; tree: ReturnType<typeof parseImportedTree>['tree']; imported: number; skipped: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exportFilesystem = (): void => {
    try {
      const payload = serializeTree(tree);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kali-web-os-filesystem-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      push(t('settings.exported'), 'success');
    } catch {
      push(t('settings.exportFailed'), 'error');
    }
  };

  const pickImport = (): void => {
    setImportError(null);
    fileRef.current?.click();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(t('settings.importTooLarge'));
      push(t('settings.importTooLarge'), 'error');
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('invalid-json');
      }
      const result = parseImportedTree(parsed);
      setPendingImport({ name: file.name, ...result });
    } catch (error) {
      const message =
        error instanceof Error && error.message !== 'invalid-json'
          ? t('settings.importFailed', { reason: error.message })
          : t('settings.importInvalid');
      setImportError(message);
      push(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async (): Promise<void> => {
    if (!pendingImport) return;
    setBusy(true);
    const ok = await replaceTree(pendingImport.tree);
    setBusy(false);
    if (ok) {
      push(t('settings.importSummary', {
        imported: pendingImport.imported,
        skipped: pendingImport.skipped,
      }), 'success');
    } else {
      push(t('toast.fsError'), 'error');
    }
    setPendingImport(null);
  };

  const doReset = async (): Promise<void> => {
    setBusy(true);
    await resetTree();
    clearLabProgress();
    resetPreferences();
    resetSession();
    setBusy(false);
    setConfirmReset(false);
    push(t('settings.resetDone'), 'success');
  };

  const storageNote = memoryOnly ? t('settings.storageWarning') : t('settings.workspaceNote');

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-ink-1/20">
      <header className="flex shrink-0 items-center gap-2 border-b border-surface-line bg-gradient-to-r from-slate-300/[0.06] via-transparent to-transparent px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-hover text-text-hi">
          <SettingsIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold text-text-hi">{t('settings.title')}</h2>
          <p className="truncate text-[10px] text-text-low">{t('settings.subtitle')}</p>
        </div>
        <Badge tone="success">{t('settings.saved')}</Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto kali-scroll">
        <div className="mx-auto w-full max-w-3xl space-y-3 p-3 sm:p-4">
          {/* Appearance -------------------------------------------------- */}
          <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
            <SectionHeading icon={<Palette />} title={t('settings.appearance')} />
            <div className="divide-y divide-surface-line/60">
              <SettingRow title={t('settings.language')} description={t('settings.languageHint2')}>
                <Segmented
                  ariaLabel={t('settings.language')}
                  value={lang}
                  onChange={(value) => {
                    setPref('lang', value as Lang);
                    push(
                      value === 'fr' ? languageNames.fr : languageNames.en,
                      'info',
                    );
                  }}
                  options={[
                    { value: 'en', label: languageNames.en },
                    { value: 'fr', label: languageNames.fr },
                  ]}
                />
              </SettingRow>

              <SettingRow title={t('settings.theme')}>
                <Segmented<ThemeMode>
                  ariaLabel={t('settings.theme')}
                  value={prefs.theme}
                  onChange={(value) => setPref('theme', value)}
                  options={[
                    { value: 'dark', label: t('settings.themeDark'), icon: <Moon /> },
                    { value: 'light', label: t('settings.themeLight'), icon: <Sun /> },
                  ]}
                />
              </SettingRow>

              <div className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-text-hi">{t('settings.wallpaper')}</p>
                    <p className="mt-0.5 text-xs text-text-low">{t('settings.wallpaperHint')}</p>
                  </div>
                  <Badge tone="neutral">{WALLPAPERS.length}</Badge>
                </div>
                <div
                  role="radiogroup"
                  aria-label={t('settings.wallpaper')}
                  className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"
                >
                  {WALLPAPERS.map((wallpaper) => {
                    const active = prefs.wallpaper === wallpaper.id;
                    return (
                      <button
                        key={wallpaper.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={t(wallpaper.labelKey)}
                        onClick={() => setPref('wallpaper', wallpaper.id as WallpaperId)}
                        data-wallpaper={wallpaper.id}
                        className={[
                          'group relative overflow-hidden rounded-lg border p-0 text-left transition focus-ring',
                          active
                            ? 'border-accent ring-2 ring-accent/40'
                            : 'border-surface-line hover:border-surface-line hover:brightness-110',
                        ].join(' ')}
                      >
                        <span className="relative block h-14 w-full overflow-hidden">
                          <span className="wallpaper" data-wallpaper={wallpaper.id} aria-hidden="true" />
                          {active ? (
                            <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[color:var(--accent-contrast)]">
                              <Check className="h-2.5 w-2.5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate bg-surface-win px-1.5 py-1 text-[10px] text-text-mid">
                          {t(wallpaper.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-text-hi">{t('settings.accent')}</p>
                    <p className="mt-0.5 text-xs text-text-low">{t('settings.accentHint')}</p>
                  </div>
                </div>
                <div
                  role="radiogroup"
                  aria-label={t('settings.accent')}
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {(Object.keys(ACCENTS) as AccentId[]).map((accent) => {
                    const active = prefs.accent === accent;
                    const color = ACCENTS[accent];
                    return (
                      <button
                        key={accent}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={t(color.labelKey)}
                        title={t(color.labelKey)}
                        onClick={() => setPref('accent', accent)}
                        className={[
                          'relative h-7 w-7 rounded-full border transition focus-ring',
                          active
                            ? 'scale-110 border-white/80 ring-2 ring-white/25'
                            : 'border-white/20 hover:scale-105',
                        ].join(' ')}
                        style={{
                          background: `linear-gradient(135deg, rgb(${color.accent2}), rgb(${color.accent}))`,
                        }}
                      >
                        {active ? (
                          <Check
                            className="absolute inset-0 m-auto h-3.5 w-3.5 text-black/70"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Terminal --------------------------------------------------- */}
          <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
            <SectionHeading icon={<Terminal />} title={t('settings.terminal')} />
            <RangeField
              label={t('settings.terminalFontSize')}
              value={prefs.terminalFontSize}
              min={TERMINAL_FONT_SIZES[0]}
              max={TERMINAL_FONT_SIZES[TERMINAL_FONT_SIZES.length - 1] ?? 20}
              step={1}
              suffix="px"
              onChange={(value) => {
                const closest = TERMINAL_FONT_SIZES.reduce((best, size) =>
                  Math.abs(size - value) < Math.abs(best - value) ? size : best,
                );
                setPref('terminalFontSize', closest);
              }}
            />
            <div className="mt-1 overflow-x-auto rounded-lg border border-surface-line bg-ink-0 p-2.5">
              <code
                className="whitespace-pre font-mono text-text-mid"
                style={{ fontSize: `${prefs.terminalFontSize}px` }}
              >
                <span className="text-emerald-300">kali@kali-sim</span>
                <span className="text-text-low">:</span>
                <span className="text-sky-300">~</span>
                <span className="text-text-low">$ </span>
                <span className="text-text-hi">uname -a</span>
                {'\n'}
                <span className="text-text-mid">Linux kali-sim 6.6.9-sim x86_64 KALI WEB OS (simulation)</span>
              </code>
            </div>

            <div className="mt-2 divide-y divide-surface-line/60">
              <Toggle
                checked={prefs.sound}
                onChange={(value) => {
                  setPref('sound', value);
                  if (value) push(t('desktop.soundOn'), 'info');
                }}
                label={t('settings.sound')}
                description={t('settings.soundHint')}
              />
              <Toggle
                checked={prefs.showSeconds}
                onChange={(value) => setPref('showSeconds', value)}
                label={t('settings.clock')}
              />
              <Toggle
                checked={prefs.reduceMotion}
                onChange={(value) => setPref('reduceMotion', value)}
                label={t('settings.motion')}
                description={t('settings.motionHint')}
              />
            </div>
          </section>

          {/* Workspace -------------------------------------------------- */}
          <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
            <SectionHeading icon={<Database />} title={t('settings.data')} />
            <p className="text-xs leading-relaxed text-text-mid">{t('settings.dataHint')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              <DataTile label={t('monitor.fsFiles')} value={String(stats.files)} />
              <DataTile label={t('monitor.fsDirs')} value={String(stats.dirs)} />
              <DataTile label={t('monitor.fsBytes')} value={humanFileSize(stats.bytes)} />
              <DataTile
                label={t('monitor.storageUsed')}
                value={
                  status === 'loading'
                    ? t('common.loading')
                    : humanFileSize(stats.bytes)
                }
              />
            </div>
            <p className="mt-1.5 text-[10px] text-text-low">{storageNote}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-surface-line bg-surface-soft/40 p-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-hi">
                  <Download className="h-3.5 w-3.5 text-accented" aria-hidden="true" />
                  {t('settings.export')}
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-text-low">
                  {t('settings.exportHint')}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  icon={<Download />}
                  onClick={exportFilesystem}
                  disabled={status !== 'ready'}
                >
                  {t('settings.exportCta')}
                </Button>
              </div>

              <div className="rounded-lg border border-surface-line bg-surface-soft/40 p-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-hi">
                  <Upload className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                  {t('settings.import')}
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-text-low">
                  {t('settings.importHint')}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  icon={<Upload />}
                  onClick={pickImport}
                  disabled={busy || status !== 'ready'}
                >
                  {t('settings.importCta')}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => void handleFile(event)}
                />
              </div>
            </div>
            {importError ? (
              <p role="alert" className="mt-2 text-[11px] text-rose-300">
                {importError}
              </p>
            ) : null}
            {pendingImport ? (
              <p className="mt-2 text-[11px] text-text-mid">
                {t('settings.importSelected', { name: pendingImport.name })}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/[0.07] p-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-medium text-rose-200">{t('settings.reset')}</p>
                <p className="text-[10px] leading-relaxed text-text-low">
                  {t('settings.resetLabHint')}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 />}
                onClick={() => setConfirmReset(true)}
              >
                {t('settings.resetCta')}
              </Button>
            </div>
          </section>

          {/* Installation & about -------------------------------------- */}
          <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
            <SectionHeading icon={<Smartphone />} title={t('settings.pwa')} />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={pwa.installed ? 'success' : 'warning'}>
                {pwa.installed ? t('monitor.installed') : t('monitor.browserTab')}
              </Badge>
              <Badge tone={pwa.swState === 'active' ? 'success' : 'neutral'}>
                {pwa.swState === 'active' ? t('monitor.swActive') : t('monitor.swNone')}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto"
                icon={<Download />}
                onClick={() => setShowInstall(true)}
              >
                {t('settings.installCta')}
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-mid">{t('install.offlineBody')}</p>
          </section>

          <section className="rounded-xl border border-surface-line bg-surface-win/55 p-3.5">
            <SectionHeading icon={<Info />} title={t('settings.about')} />
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accented" aria-hidden="true" />
              <div>
                <p className="text-[11px] leading-relaxed text-text-mid">{t('settings.aboutBody')}</p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-low">
                  {t('settings.aboutTech')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="neutral">{t('settings.version')}</Badge>
                  <Badge tone="sim">{t('common.simulated')}</Badge>
                  <Badge tone="success">PWA</Badge>
                  <Badge tone="accent">{locale}</Badge>
                </div>
              </div>
            </div>
          </section>

          <p className="pb-2 text-center text-[10px] text-text-low">{t('desktop.simBadge')}</p>
        </div>
      </div>

      {busy ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 backdrop-blur-sm">
          <div className="win-surface rounded-xl border border-surface-line px-4 py-2">
            <Spinner label={t('common.loading')} />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        title={t('settings.resetTitle')}
        body={`${t('settings.resetBody')} ${t('settings.resetWindows')}`}
        confirmLabel={t('settings.resetConfirm')}
        cancelLabel={t('settings.confirmKeep')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void doReset()}
      />

      <ConfirmDialog
        open={pendingImport !== null}
        title={t('settings.importConfirmTitle')}
        body={t('settings.importConfirmBody', { name: pendingImport?.name ?? '' })}
        confirmLabel={t('common.import')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setPendingImport(null)}
        onConfirm={() => void confirmImport()}
        danger={false}
      />

      <InstallDialog open={showInstall} onClose={() => setShowInstall(false)} />
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }): ReactNode {
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-surface-line pb-2">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-soft text-accented [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      <h3 className="text-[12.5px] font-semibold text-text-hi">{title}</h3>
    </div>
  );
}

function DataTile({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="rounded-lg border border-surface-line bg-surface-soft/50 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-text-low">{label}</p>
      <p className="mt-0.5 font-mono text-[11.5px] text-text-hi">{value}</p>
    </div>
  );
}

