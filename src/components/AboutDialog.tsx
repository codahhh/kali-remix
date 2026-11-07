import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Controls';
import { Logo } from './ui/Logo';
import { usePreferences } from '../state/PreferencesContext';

export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { t } = usePreferences();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('desktop.about')}
      closeLabel={t('common.close')}
      size="md"
      icon={<Info className="h-4 w-4" />}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 border-b border-surface-line pb-5 text-center">
        <Logo className="h-16 w-16" title="KALI WEB OS" />
        <div>
          <p className="font-display text-lg font-bold tracking-[0.2em] text-text-hi">
            KALI WEB OS
          </p>
          <p className="mt-1 text-xs text-text-low">{t('settings.version')}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <Badge tone="sim">{t('common.simulated')}</Badge>
          <Badge tone="success">{t('common.live')}: IndexedDB</Badge>
          <Badge tone="accent">PWA</Badge>
        </div>
      </div>
      <div className="space-y-3 pt-4">
        <p className="text-[13px] leading-relaxed text-text-mid">{t('settings.aboutBody')}</p>
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          {t('desktop.simBadge')}
        </p>
        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-surface-soft px-3 py-2">
            <dt className="text-text-low">React · TypeScript · Vite</dt>
            <dd className="font-medium text-text-hi">Frontend stack</dd>
          </div>
          <div className="rounded-lg bg-surface-soft px-3 py-2">
            <dt className="text-text-low">GitHub Pages / static hosting</dt>
            <dd className="font-medium text-text-hi">Deployment</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
