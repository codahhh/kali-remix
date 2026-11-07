import { useState, type ReactNode } from 'react';
import { FileText, FolderOpen, ShieldCheck } from 'lucide-react';
import { APP_META, APP_ORDER } from '../apps/meta';
import { usePreferences } from '../state/PreferencesContext';
import { useWindows } from '../state/WindowContext';
import { useFs } from '../state/FsContext';
import { AppIcon } from './AppIcon';
import { Logo } from './ui/Logo';
import { Badge } from './ui/Controls';
import type { AppId } from '../lib/types';

interface Entry {
  key: string;
  label: string;
  kind: 'app' | 'file';
  appId: AppId;
  path?: string;
  icon?: typeof FileText;
}

export function DesktopIcons(): ReactNode {
  const { t, prefs } = usePreferences();
  const { viewport, openApp, windows, minimizeAll } = useWindows();
  const { tree } = useFs();
  const [selected, setSelected] = useState<string | null>(null);

  const desktopEntries: Entry[] = [
    { key: 'files', label: t('desktop.files'), kind: 'app', appId: 'files' },
    { key: 'terminal', label: t('desktop.terminal'), kind: 'app', appId: 'terminal' },
    { key: 'lab', label: t('desktop.lab'), kind: 'app', appId: 'lab' },
    { key: 'network', label: t('desktop.network'), kind: 'app', appId: 'network' },
    {
      key: 'welcome',
      label: tree['/home/kali/Documents/welcome.md'] ? t('desktop.welcomeFile') : t('desktop.lessons'),
      kind: 'file',
      appId: 'editor',
      path: '/home/kali/Documents/welcome.md',
      icon: FileText,
    },
    { key: 'settings', label: t('desktop.settings'), kind: 'app', appId: 'settings' },
  ];

  const openEntry = (entry: Entry): void => {
    if (entry.kind === 'file' && entry.path) {
      openApp('editor', { props: { path: entry.path } });
    } else {
      openApp(entry.appId);
    }
  };

  const iconButton = (entry: Entry, size: 'md' | 'lg', showLabel = true): ReactNode => {
    const isSelected = selected === entry.key;
    const Icon = entry.icon;
    return (
      <button
        key={entry.key}
        type="button"
        onClick={() => {
          setSelected(entry.key);
          if (!viewport.isDesktop) openEntry(entry);
        }}
        onDoubleClick={() => {
          if (viewport.isDesktop) openEntry(entry);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openEntry(entry);
          }
        }}
        onFocus={() => setSelected(entry.key)}
        aria-label={entry.label}
        className={[
          'group flex w-[76px] flex-col items-center gap-1 rounded-lg p-1.5 text-center transition-colors focus-ring sm:w-[84px]',
          isSelected ? 'bg-white/10 ring-1 ring-white/15' : 'hover:bg-white/5',
        ].join(' ')}
      >
        {entry.kind === 'app' ? (
          <AppIcon appId={entry.appId} size={size} />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-teal-300/25 to-emerald-500/10 text-teal-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] sm:h-14 sm:w-14"
          >
            {Icon ? <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.7} /> : null}
          </span>
        )}
        {showLabel ? (
          <span className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {entry.label}
          </span>
        ) : null}
      </button>
    );
  };

  if (!viewport.isDesktop) {
    // Mobile home screen: one card per app, generous touch targets.
    const openCount = windows.filter((w) => !w.minimized).length;
    return (
      <div className="absolute inset-0 overflow-y-auto kali-scroll px-4 pb-24 pt-5">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accented/80">
                  {t('desktop.kaliBrand')} {t('desktop.webos')}
                </p>
                <p className="text-[13px] font-medium text-white/90">{t('desktop.desktop')}</p>
              </div>
            </div>
            {openCount > 0 ? (
              <button
                type="button"
                onClick={minimizeAll}
                className="rounded-lg border border-white/15 bg-black/25 px-2.5 py-1.5 text-[11px] text-white/80 backdrop-blur transition hover:bg-black/40 focus-ring"
              >
                {t('desktop.showDesktop')}
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {APP_ORDER.map((appId) => {
              const meta = APP_META[appId];
              return (
                <button
                  key={appId}
                  type="button"
                  onClick={() => openApp(appId)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-surface-win/75 p-3 text-left shadow-lg backdrop-blur transition active:scale-[0.98] focus-ring"
                >
                  <AppIcon appId={appId} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-white">
                      {t(meta.nameKey)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/60">
                      {t(meta.descriptionKey)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-white/70">{t('desktop.simBadge')}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => openApp('editor', { props: { path: '/home/kali/Documents/welcome.md' } })}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-win/60 p-2.5 text-left backdrop-blur focus-ring"
            >
              <FileText className="h-4 w-4 shrink-0 text-teal-200" aria-hidden="true" />
              <span className="truncate text-[11px] text-white/80">{t('desktop.welcomeFile')}</span>
            </button>
            <button
              type="button"
              onClick={() => openApp('files', { props: { path: '/home/kali/Lessons' } })}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-win/60 p-2.5 text-left backdrop-blur focus-ring"
            >
              <FolderOpen className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
              <span className="truncate text-[11px] text-white/80">{t('desktop.lessons')}</span>
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 pb-2">
            <Badge tone="neutral" className="border-white/15 bg-black/25 text-white/60">
              {t('desktop.version')}
            </Badge>
            <Badge tone="sim" className="border-violet-400/25 bg-violet-500/15">
              {prefs.lang.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="absolute left-2 top-2 z-[5] flex flex-col items-start gap-0.5"
        role="list"
        aria-label={t('desktop.desktop')}
      >
        {desktopEntries.map((entry) => (
          <span role="listitem" key={entry.key}>
            {iconButton(entry, 'lg')}
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 text-center"
        aria-hidden="true"
      >
        <Logo className="h-16 w-16 opacity-20" />
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.42em] text-white/25">
          {t('desktop.kaliBrand')} {t('desktop.webos')}
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-[calc(var(--dock-height)+18px)] left-4 hidden max-w-[280px] flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md md:flex">
        <div className="flex items-center gap-2">
          <Logo className="h-4 w-4" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            {t('desktop.kaliBrand')} {t('desktop.webos')}
          </span>
          <Badge tone="sim" className="ml-auto border-violet-400/25 bg-violet-500/15">
            {t('common.simulated')}
          </Badge>
        </div>
        <p className="text-[10px] leading-relaxed text-white/50">{t('desktop.simBadge')}</p>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseglow" />
          {t('desktop.version')}
        </div>
      </div>
    </>
  );
}
