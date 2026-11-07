import type { ReactNode } from 'react';
import { AppWindow, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useWindows } from '../state/WindowContext';
import { usePreferences } from '../state/PreferencesContext';
import { APP_META } from '../apps/meta';
import { AppIcon } from './AppIcon';
import { EmptyState } from './ui/Feedback';
import { Button } from './ui/Button';

export function MobileSwitcher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { t } = usePreferences();
  const { windows, focusWindow, closeWindow, closeAll } = useWindows();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('desktop.mobileWindows')}
      closeLabel={t('common.close')}
      size="md"
      footer={
        windows.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={closeAll}>
            {t('panel.closeAll')}
          </Button>
        ) : null
      }
    >
      {windows.length === 0 ? (
        <EmptyState icon={AppWindow} title={t('desktop.noWindows')} compact />
      ) : (
        <ul className="space-y-2">
          {windows
            .slice()
            .sort((a, b) => b.z - a.z)
            .map((win) => {
              const meta = APP_META[win.appId];
              return (
                <li key={win.id}>
                  <div className="flex items-center gap-2 rounded-xl border border-surface-line bg-surface-soft/60 p-2">
                    <button
                      type="button"
                      onClick={() => {
                        focusWindow(win.id);
                        onClose();
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left focus-ring"
                    >
                      <AppIcon appId={win.appId} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-text-hi">
                          {t(meta.nameKey)}
                        </span>
                        <span className="block truncate text-[10px] text-text-low">
                          {win.minimized ? t('desktop.minimize') : t('desktop.focusedWindow')}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => closeWindow(win.id)}
                      aria-label={`${t('common.close')} — ${t(meta.nameKey)}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-mid transition hover:bg-rose-500/20 hover:text-rose-200 focus-ring"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </Modal>
  );
}
