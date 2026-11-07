import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './ui/Logo';
import { usePreferences } from '../state/PreferencesContext';
import { useFs } from '../state/FsContext';

export function BootSplash({ onDone }: { onDone: () => void }): ReactNode {
  const { t } = usePreferences();
  const { status } = useFs();
  const [leaving, setLeaving] = useState(false);
  const ready = status !== 'loading';

  useEffect(() => {
    if (!ready) return;
    const start = window.setTimeout(() => setLeaving(true), 380);
    const done = window.setTimeout(onDone, 820);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(done);
    };
  }, [ready, onDone]);

  return (
    <div
      className={[
        'fixed inset-0 z-[200] grid place-items-center bg-[#05080f] transition-opacity duration-500 safe-top',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          aria-hidden="true"
          className="absolute -inset-x-24 -top-24 h-64 bg-[radial-gradient(closest-side,rgb(43_143_255/0.25),transparent)]"
        />
        <Logo className="relative h-20 w-20 animate-pulseglow" title="KALI WEB OS" />
        <p className="mt-5 font-display text-lg font-bold tracking-[0.34em] text-[#e9f2fc]">
          KALI WEB OS
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300/70">
          {t('desktop.boot')}
        </p>
        <div className="mt-6 h-1 w-52 overflow-hidden rounded-full bg-white/10">
          <div
            className={[
              'h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-all duration-700 ease-out',
              ready ? 'w-full' : 'w-1/3',
            ].join(' ')}
          />
        </div>
        <p className="mt-3 text-[11px] text-white/40">{t('desktop.bootHint')}</p>
      </div>
    </div>
  );
}
