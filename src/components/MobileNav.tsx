import type { ReactNode } from 'react';
import { AppWindow, Home, LayoutGrid, Settings } from 'lucide-react';
import { usePreferences } from '../state/PreferencesContext';
import { useWindows } from '../state/WindowContext';
import { useViewport } from '../hooks/useViewport';
import { MOBILE_NAV_HEIGHT } from '../state/WindowContext';

interface MobileNavProps {
  onOpenLauncher: () => void;
  onOpenSwitcher: () => void;
  onShowHome: () => void;
}

export function MobileNav({
  onOpenLauncher,
  onOpenSwitcher,
  onShowHome,
}: MobileNavProps): ReactNode {
  const { t } = usePreferences();
  const { windows, openApp, activeWindow } = useWindows();
  const viewport = useViewport();

  if (viewport.isDesktop) return null;

  const items = [
    { id: 'home', label: t('desktop.mobileHome'), icon: Home, onClick: onShowHome, active: !activeWindow },
    {
      id: 'apps',
      label: t('desktop.mobileApps'),
      icon: LayoutGrid,
      onClick: onOpenLauncher,
      active: false,
    },
    {
      id: 'windows',
      label: t('desktop.mobileWindows'),
      icon: AppWindow,
      onClick: onOpenSwitcher,
      active: Boolean(activeWindow),
      badge: windows.length,
    },
    {
      id: 'settings',
      label: t('desktop.mobileSettings'),
      icon: Settings,
      onClick: () => openApp('settings'),
      active: activeWindow?.appId === 'settings',
    },
  ];

  return (
    <nav
      aria-label={t('desktop.taskbar')}
      className="glass absolute inset-x-0 bottom-0 z-[100] flex items-stretch border-t border-surface-line"
      style={{
        height: `calc(${MOBILE_NAV_HEIGHT}px + var(--safe-bottom))`,
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className={[
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors focus-ring',
              item.active ? 'text-accented' : 'text-text-low hover:text-text-hi',
            ].join(' ')}
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 min-w-[15px] rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-[15px] text-[color:var(--accent-contrast)]">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {item.label}
            {item.active ? (
              <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-accented" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
