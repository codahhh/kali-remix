import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  platforms?: string[];
}

export interface PwaState {
  installAvailable: boolean;
  installed: boolean;
  standalone: boolean;
  iosHint: boolean;
  swState: 'unsupported' | 'pending' | 'active' | 'none';
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

function detectStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function detectIos(): boolean {
  const ua = navigator.userAgent;
  const iosLike = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const notStandaloneBrowser = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iosLike && notStandaloneBrowser;
}

export function usePwa(): PwaState {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(detectStandalone);
  const [standalone, setStandalone] = useState(detectStandalone);
  const [swState, setSwState] = useState<PwaState['swState']>('pending');

  useEffect(() => {
    const onPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = (): void => setStandalone(detectStandalone());
    mq.addEventListener?.('change', onChange);

    let cancelled = false;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (cancelled) return;
          if (reg?.active) setSwState('active');
          else if (reg) setSwState('pending');
          else setSwState('none');
        })
        .catch(() => !cancelled && setSwState('none'));
      navigator.serviceWorker.ready
        .then((reg) => {
          if (!cancelled && reg.active) setSwState('active');
        })
        .catch(() => undefined);
    } else {
      setSwState('unsupported');
    }

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!installEvent) return 'unavailable';
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, [installEvent]);

  return {
    installAvailable: installEvent !== null,
    installed: installed || standalone,
    standalone,
    iosHint: detectIos(),
    swState,
    promptInstall,
  };
}
