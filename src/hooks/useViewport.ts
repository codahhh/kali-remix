import { useEffect, useState } from 'react';

export interface Viewport {
  width: number;
  height: number;
  /** Pointer-first desktop layout with floating windows. */
  isDesktop: boolean;
  isMobile: boolean;
  /** Portrait phone-ish layout. */
  isNarrow: boolean;
}

function read(): Viewport {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  return {
    width,
    height,
    isDesktop: width >= 1024,
    isMobile: width < 768,
    isNarrow: width < 520,
  };
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(read);

  useEffect(() => {
    let frame = 0;
    const onResize = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport(read()));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return viewport;
}
