import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Toast, ToastKind } from '../lib/types';

interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      counter += 1;
      const id = `toast-${counter}`;
      setToasts((list) => [...list.slice(-3), { id, kind, message }]);
      const timer = window.setTimeout(() => {
        setToasts((list) => list.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, kind === 'error' ? 6000 : 3600);
      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) window.clearTimeout(timer);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
