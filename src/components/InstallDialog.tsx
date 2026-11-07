import type { ReactNode } from 'react';
import {
  CloudOff,
  Download,
  MonitorSmartphone,
  Share,
  ShieldAlert,
  Smartphone,
  TabletSmartphone,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Controls';
import { usePwaContext } from '../state/PwaContext';
import { usePreferences } from '../state/PreferencesContext';
import { useToast } from '../state/ToastContext';
import { Logo } from './ui/Logo';

export function InstallDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { t } = usePreferences();
  const { installAvailable, installed, iosHint, promptInstall, swState } = usePwaContext();
  const { push } = useToast();

  const install = async (): Promise<void> => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      push(t('install.installedTitle'), 'success');
      onClose();
    } else if (outcome === 'dismissed') {
      push(t('common.notNow'), 'info');
    }
  };

  const platforms = [
    {
      icon: Smartphone,
      title: t('install.androidTitle'),
      body: t('install.androidBody'),
    },
    {
      icon: TabletSmartphone,
      title: t('install.iosTitle'),
      body: t('install.iosBody'),
      highlight: iosHint,
    },
    {
      icon: MonitorSmartphone,
      title: t('install.desktopTitle'),
      body: t('install.desktopBody'),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('install.title')}
      description={t('install.subtitle')}
      closeLabel={t('common.close')}
      size="lg"
      icon={<Download className="h-4 w-4" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('install.close')}
          </Button>
          {installAvailable ? (
            <Button variant="primary" icon={<Download />} onClick={() => void install()}>
              {t('install.installNow')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-surface-line bg-gradient-to-br from-accent/12 via-transparent to-transparent p-4 sm:flex-row sm:items-center">
          <Logo className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-text-hi">
                {installed ? t('install.installedTitle') : installAvailable ? t('install.availableTitle') : t('install.helpButton')}
              </p>
              <Badge tone={installed ? 'success' : swState === 'active' ? 'accent' : 'warning'}>
                {installed ? t('monitor.installed') : t('monitor.browserTab')}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-text-mid">
              {installed
                ? t('install.installedBody')
                : installAvailable
                  ? t('install.availableBody')
                  : t('install.safariHint')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <div
                key={platform.title}
                className={[
                  'flex gap-3 rounded-xl border p-3.5',
                  platform.highlight
                    ? 'border-accent/35 bg-accent/[0.07]'
                    : 'border-surface-line bg-surface-soft/40',
                ].join(' ')}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-hover text-accented">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-hi">{platform.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-mid">{platform.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-line bg-surface-soft/40 p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-text-hi">
              <CloudOff className="h-4 w-4 text-emerald-300" aria-hidden="true" />
              {t('install.offlineTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-mid">{t('install.offlineBody')}</p>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-amber-200">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              {t('install.limitationsTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-mid">
              {t('install.limitationsBody')}
            </p>
          </div>
        </div>

        {!installed ? (
          <p className="flex items-start gap-2 rounded-lg border border-surface-line bg-surface-soft/40 px-3 py-2 text-[11px] leading-relaxed text-text-low">
            <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('install.safariHint')}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
