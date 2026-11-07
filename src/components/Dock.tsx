import type { ReactNode } from 'react';
import { LayoutGrid } from 'lucide-react';
import { APP_META, DOCK_APPS } from '../apps/meta';
import { usePreferences } from '../state/PreferencesContext';
import { useWindows } from '../state/WindowContext';
import { AppIcon } from './AppIcon';

interface DockProps {
  onOpenLauncher: () => void;
}

export function Dock({ onOpenLauncher }: DockProps): ReactNode {
  const { t, say } = usePreferences();
  const { windows, activeId, openApp, focusWindow, minimizeWindow } = useWindows();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[calc(10px+var(--safe-bottom))]">
      <nav
        aria-label={t('desktop.dock')}
        className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-end gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-surface-bar/90 p-1.5 shadow-dock backdrop-blur-xl kali-scroll sm:gap-1.5 sm:p-2"
      >
        {DOCK_APPS.map((appId) => {
          const meta = APP_META[appId];
          const appWindows = windows.filter((w) => w.appId === appId);
          const isActive =
            appWindows.some((w) => w.id === activeId && !w.minimized) &&
            !appWindows.every((w) => w.minimized);
          const running = appWindows.length > 0;
          const label = t(meta.nameKey);
          return (
            <button
              key={appId}
              type="button"
              onClick={() => {
                const visible = appWindows.find((w) => !w.minimized);
                if (isActive && visible) {
                  minimizeWindow(visible.id);
                } else if (running) {
                  const target = visible ?? appWindows[0];
                  if (target) focusWindow(target.id);
                } else {
                  openApp(appId);
                }
                say('click');
              }}
              aria-label={label}
              aria-current={isActive ? 'true' : undefined}
              title={label}
              className="group relative flex flex-col items-center rounded-xl p-0.5 transition-transform duration-150 focus-ring active:scale-95 hover:-translate-y-0.5"
            >
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-line bg-surface-win px-2 py-1 text-[10px] text-text-hi opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                {label}
              </span>
              <AppIcon
                appId={appId}
                size="md"
                className={[
                  'transition-all duration-200',
                  isActive
                    ? 'ring-2 ring-accent/70 brightness-110'
                    : 'ring-1 ring-transparent group-hover:brightness-110',
                ].join(' ')}
              />
              <span
                aria-hidden="true"
                className={[
                  'mt-1 h-[3px] w-[3px] rounded-full transition-all duration-200',
                  isActive ? 'w-3.5 bg-accented' : running ? 'bg-accent/70' : 'bg-transparent',
                ].join(' ')}
              />
            </button>
          );
        })}

        <span className="mx-1 h-9 w-px self-center bg-white/10" aria-hidden="true" />

        <button
          type="button"
          onClick={onOpenLauncher}
          aria-label={t('desktop.launcher')}
          title={t('desktop.launcher')}
          className="group relative flex flex-col items-center rounded-xl p-0.5 transition-transform duration-150 focus-ring active:scale-95 hover:-translate-y-0.5"
        >
          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-line bg-surface-win px-2 py-1 text-[10px] text-text-hi opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {t('desktop.activities')}
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-text-hi transition-colors group-hover:bg-accent/20 group-hover:text-accented">
            <LayoutGrid className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <span aria-hidden="true" className="mt-1 h-[3px] w-[3px] rounded-full bg-transparent" />
        </button>
      </nav>
    </div>
  );
}
