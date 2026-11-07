import { createContext, useContext, type ReactNode } from 'react';
import { usePwa, type PwaState } from '../hooks/usePwa';

const PwaContext = createContext<PwaState | null>(null);

export function PwaProvider({ children }: { children: ReactNode }): ReactNode {
  const pwa = usePwa();
  return <PwaContext.Provider value={pwa}>{children}</PwaContext.Provider>;
}

export function usePwaContext(): PwaState {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwaContext must be used inside PwaProvider');
  return ctx;
}
