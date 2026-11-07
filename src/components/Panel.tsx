import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Download,
  Info,
  LayoutGrid,
  Maximize2,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { usePreferences } from '../state/PreferencesContext';
import { useWindows } from '../state/WindowContext';
import { usePwaContext } from '../state/PwaContext';
import { useOnline } from '../hooks/useOnline';
import { useNow } from '../hooks/useNow';
import { APP_META } from '../apps/meta';
import { AppIcon } from './AppIcon';
import { Logo } from './ui/Logo';
import { IconButton } from './ui/IconButton';
import { Button } from './ui/Button';

interface PanelProps {
  onOpenLauncher: () => void;
  onOpenInstall: () => void;
  onOpenAbout: () => void;
}

export function Panel({ onOpenLauncher, onOpenInstall, onOpenAbout }: PanelProps): ReactNode {
  const { prefs, setPref, t, locale, say } = usePreferences();
  const { windows, activeId, focusWindow, minimizeWindow, minimizeAll, openApp } = useWindows();
  const { installAvailable } = usePwaContext();
  const online = useOnline();
  const now = useNow(1000);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(prefs.showSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);
  const longDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  const toggleTheme = (): void => {
    setPref('theme', prefs.theme === 'dark' ? 'light' : 'dark');
    say('toggle');
  };

  return (
    <header
      role="banner"
      className="glass absolute inset-x-0 top-0 z-[100] border-b border-surface-line safe-top"
      style={{ height: 'calc(var(--panel-height) + var(--safe-top))' }}
    >
      <div
        className="flex h-[var(--panel-height)] items-stretch justify-between gap-2"
      >
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            onClick={onOpenLauncher}
            className="group flex items-center gap-2 border-r border-surface-line px-2.5 transition-colors hover:bg-accent/10 focus-ring sm:px-3"
            aria-label={t('desktop.launcher')}
            title={t('desktop.launcher')}
          >
            <Logo className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-6" />
            <span className="hidden items-baseline gap-1 sm:flex">
              <span className="font-display text-[13px] font-bold tracking-[0.2em] text-text-hi">
                {t('desktop.kaliBrand')}
              </span>
              <span className="text-[9px] font-semibold tracking-[0.22em] text-accented/80">
                {t('desktop.webos')}
              </span>
            </span>
            <ChevronDown className="hidden h-3 w-3 text-text-low sm:block" aria-hidden="true" />
          </button>

          <div
            className="hidden min-w-0 items-center gap-1 overflow-x-auto px-2 lg:flex"
            role="group"
            aria-label={t('desktop.taskbar')}
          >
            {windows.length === 0 ? (
              <span className="px-2 text-[11px] text-text-low">{t('desktop.noWindows')}</span>
            ) : (
              windows
                .slice()
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((win) => {
                  const meta = APP_META[win.appId];
                  const active = win.id === activeId && !win.minimized;
                  return (
                    <div
                      key={win.id}
                      className={[
                        'group flex h-6 max-w-[190px] shrink-0 items-center rounded-md border transition-colors',
                        active
                          ? 'border-accent/40 bg-accent/15'
                          : 'border-transparent hover:border-surface-line hover:bg-surface-hover',
                        win.minimized ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => (active ? minimizeWindow(win.id) : focusWindow(win.id))}
                        className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1 text-left focus-ring"
                        title={t(meta.nameKey)}
                      >
                        <AppIcon appId={win.appId} size="xs" className="!h-4 !w-4 !rounded" />
                        <span
                          className={[
                            'truncate text-[11px]',
                            active ? 'text-accented' : 'text-text-mid',
                          ].join(' ')}
                        >
                          {t(meta.nameKey)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => minimizeWindow(win.id)}
                        aria-label={`${t('desktop.minimize')} ${t(meta.nameKey)}`}
                        className="hidden h-5 w-5 shrink-0 place-items-center rounded text-text-low hover:bg-surface-hover hover:text-text-hi group-hover:grid focus-ring"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pr-1">
          {installAvailable ? (
            <button
              type="button"
              onClick={onOpenInstall}
              className="mr-1 hidden h-6 items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2 text-[10px] font-semibold text-accented transition hover:bg-accent/25 focus-ring md:flex"
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              {t('common.install')}
            </button>
          ) : null}

          <IconButton
            label={online ? t('desktop.online') : t('desktop.offline')}
            size="sm"
            className="hidden sm:grid"
            onClick={() => {
              setMenuOpen(true);
            }}
          >
            {online ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-300/90" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            )}
          </IconButton>

          <IconButton
            label={prefs.sound ? t('desktop.soundOn') : t('desktop.soundOff')}
            size="sm"
            onClick={() => {
              setPref('sound', !prefs.sound);
              say('toggle');
            }}
            aria-pressed={prefs.sound}
            className="hidden sm:grid"
          >
            {prefs.sound ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </IconButton>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="ml-0.5 flex h-7 items-center gap-2 rounded-md px-2 text-right transition-colors hover:bg-surface-hover focus-ring"
          >
            <span className="hidden text-[10px] uppercase tracking-wider text-text-low md:block">
              {date}
            </span>
            <span className="font-mono text-[12px] font-medium tabular-nums text-text-hi">
              {time}
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          ref={menuRef}
          role="dialog"
          aria-label={t('desktop.quickSettings')}
          className="win-surface absolute right-2 top-[calc(100%+6px)] w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-xl border border-surface-line animate-slide-down"
        >
          <div className="border-b border-surface-line bg-gradient-to-br from-accent/12 to-transparent px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-low">
              {t('desktop.kaliBrand')} {t('desktop.webos')}
            </p>
            <p className="mt-1 text-sm font-medium capitalize text-text-hi">{longDate}</p>
            <p className="mt-0.5 text-xs text-text-mid">
              {date} · <span className="font-mono tabular-nums">{time}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-surface-line bg-surface-soft/60 px-2 py-2.5 text-[11px] text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
            >
              {prefs.theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-sky-400" aria-hidden="true" />
              )}
              {prefs.theme === 'dark' ? t('settings.themeLight') : t('settings.themeDark')}
            </button>
            <button
              type="button"
              onClick={onOpenInstall}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-surface-line bg-surface-soft/60 px-2 py-2.5 text-[11px] text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
            >
              <Download className="h-4 w-4 text-accented" aria-hidden="true" />
              {t('common.install')}
            </button>
            <button
              type="button"
              onClick={minimizeAll}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-surface-line bg-surface-soft/60 px-2 py-2.5 text-[11px] text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
            >
              <LayoutGrid className="h-4 w-4 text-violet-300" aria-hidden="true" />
              {t('desktop.showDesktop')}
            </button>
          </div>

          <div className="space-y-1 border-t border-surface-line p-2">
            <MenuRow icon={<Maximize2 className="h-3.5 w-3.5" />} onClick={onOpenAbout}>
              {t('desktop.about')}
            </MenuRow>
            <MenuRow
              icon={<Settings className="h-3.5 w-3.5" />}
              onClick={() => {
                openApp('settings');
                setMenuOpen(false);
              }}
            >
              {t('settings.title')}
            </MenuRow>
          </div>

          <p className="flex items-center gap-1.5 border-t border-surface-line px-3 py-2 text-[10px] leading-snug text-text-low">
            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t('desktop.simBadge')}
          </p>
        </div>
      ) : null}
    </header>
  );
}

function MenuRow({
  icon,
  children,
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}): ReactNode {
  return (
    <Button variant="ghost" size="sm" fullWidth className="justify-start" onClick={onClick}>
      <span className="text-text-low [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="text-xs">{children}</span>
    </Button>
  );
}
