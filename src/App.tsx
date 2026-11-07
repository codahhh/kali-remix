import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Panel } from './components/Panel';
import { Dock } from './components/Dock';
import { DesktopIcons } from './components/DesktopIcons';
import { WindowLayer } from './components/WindowLayer';
import { Launcher } from './components/Launcher';
import { MobileNav } from './components/MobileNav';
import { MobileSwitcher } from './components/MobileSwitcher';
import { InstallDialog } from './components/InstallDialog';
import { AboutDialog } from './components/AboutDialog';
import { BootSplash } from './components/BootSplash';
import { ToastHost } from './components/ui/Feedback';
import { MOBILE_NAV_HEIGHT, useWindows } from './state/WindowContext';
import { usePreferences } from './state/PreferencesContext';
import { useFs } from './state/FsContext';
import { useToast } from './state/ToastContext';
import { isAppId } from './apps/meta';

export function App(): ReactNode {
  const { viewport, openApp, cycleWindows, minimizeAll, windows } = useWindows();
  const { prefs, t } = usePreferences();
  const { status, loadError, memoryOnly } = useFs();
  const { push } = useToast();

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const deepLinkHandled = useRef(false);
  const shortcutsRef = useRef({ openApp, cycleWindows, minimizeAll });
  shortcutsRef.current = { openApp, cycleWindows, minimizeAll };

  const openLauncher = useCallback(() => setLauncherOpen(true), []);
  const closeLauncher = useCallback(() => setLauncherOpen(false), []);

  // Warn once if IndexedDB is unavailable (private mode, blocked storage…).
  useEffect(() => {
    if (status === 'ready' && (loadError || memoryOnly)) {
      push(t('toast.fsError'), 'warning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const up = (): void => setOnline(true);
    const down = (): void => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Deep link from the manifest shortcuts (?app=terminal).
  useEffect(() => {
    if (status !== 'ready' || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    try {
      const param = new URLSearchParams(window.location.search).get('app');
      if (param && isAppId(param)) {
        openApp(param);
        window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      }
    } catch {
      /* ignore malformed URLs */
    }
  }, [status, openApp]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setLauncherOpen((open) => !open);
        return;
      }
      if (meta && event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        shortcutsRef.current.openApp('terminal');
        return;
      }
      if (event.altKey && (event.key === 'Tab' || event.code === 'Tab')) {
        event.preventDefault();
        shortcutsRef.current.cycleWindows(event.shiftKey ? -1 : 1);
        return;
      }
      if (meta && event.key.toLowerCase() === 'd' && !event.shiftKey) {
        if ((event.target as HTMLElement | null)?.closest('input, textarea')) return;
        event.preventDefault();
        shortcutsRef.current.minimizeAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink-1 text-text-hi">
      <div className="wallpaper" data-wallpaper={prefs.wallpaper} aria-hidden="true" />

      <a
        href="#desktop-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[300] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[color:var(--accent-contrast)]"
      >
        {prefs.lang === 'fr' ? 'Aller au bureau' : 'Skip to desktop'}
      </a>

      <Panel
        onOpenLauncher={openLauncher}
        onOpenInstall={() => setInstallOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <main
        id="desktop-main"
        tabIndex={-1}
        aria-label={t('desktop.desktop')}
        className="absolute inset-x-0 bottom-0 outline-none"
        style={{
          top: 'calc(var(--panel-height) + var(--safe-top))',
          bottom: viewport.isDesktop ? 0 : `calc(${MOBILE_NAV_HEIGHT}px + var(--safe-bottom))`,
        }}
      >
        <DesktopIcons />
        <WindowLayer />
        {viewport.isDesktop ? <Dock onOpenLauncher={openLauncher} /> : null}
        {windows.length === 0 && !viewport.isDesktop ? <MobileHomeNudge /> : null}
      </main>

      {!viewport.isDesktop ? (
        <MobileNav
          onOpenLauncher={openLauncher}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onShowHome={minimizeAll}
        />
      ) : null}

      <Launcher open={launcherOpen} onClose={closeLauncher} />
      <MobileSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <ToastHost />

      {!online ? (
        <div className="pointer-events-none absolute left-1/2 top-[calc(var(--panel-height)+var(--safe-top)+10px)] z-[95] -translate-x-1/2 animate-fade-in">
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-[10px] font-medium text-amber-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />
            {t('desktop.offline')}
          </div>
        </div>
      ) : null}

      {booting ? <BootSplash onDone={() => setBooting(false)} /> : null}
    </div>
  );
}

function MobileHomeNudge(): ReactNode {
  const { t } = usePreferences();
  const { openApp } = useWindows();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
      <button
        type="button"
        onClick={() => openApp('terminal')}
        className="pointer-events-auto max-w-full truncate rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[11px] text-white/70 backdrop-blur transition hover:bg-black/60 focus-ring"
      >
        {t('terminal.hint')}
      </button>
    </div>
  );
}
