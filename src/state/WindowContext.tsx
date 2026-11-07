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
import { APP_META, isAppId } from '../apps/meta';
import type { AppId, PersistedSession, WindowProps, WindowRect, WindowState } from '../lib/types';
import { useViewport, type Viewport } from '../hooks/useViewport';
import { usePreferences } from './PreferencesContext';
import { useToast } from './ToastContext';

const SESSION_KEY = 'kaliwebos.session.v1';
const MAX_WINDOWS = 10;
export const PANEL_HEIGHT = 34;
export const DOCK_SPACE = 96;

interface OpenOptions {
  props?: WindowProps;
  forceNew?: boolean;
}

interface WindowContextValue {
  windows: WindowState[];
  activeId: string | null;
  activeWindow: WindowState | null;
  viewport: Viewport;
  openApp: (appId: AppId, options?: OpenOptions) => string | null;
  closeWindow: (id: string) => void;
  forceCloseWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setGeometry: (id: string, rect: Partial<WindowRect>) => void;
  cycleWindows: (direction: 1 | -1) => void;
  minimizeAll: () => void;
  restoreAll: () => void;
  closeAll: () => void;
  resetSession: () => void;
  registerCloseGuard: (id: string, guard: () => boolean) => () => void;
  windowTitle: (win: WindowState) => { name: string; detail?: string };
}

const WindowContext = createContext<WindowContextValue | null>(null);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `win-${Date.now().toString(36)}-${idCounter}`;
}

export const MOBILE_NAV_HEIGHT = 64;
export const MAXIMIZED_BOTTOM_GAP = 78;

/** Size of the area available to windows (below the panel, above the mobile nav). */
export function desktopArea(viewport: Viewport): { w: number; h: number } {
  return {
    w: viewport.width,
    h: Math.max(240, viewport.height - PANEL_HEIGHT - (viewport.isDesktop ? 0 : MOBILE_NAV_HEIGHT)),
  };
}

function clampRect(rect: WindowRect, viewport: Viewport): WindowRect {
  const area = desktopArea(viewport);
  const minX = 6;
  const minY = 6;
  const maxX = Math.max(minX + 320, area.w - 6);
  const maxY = Math.max(minY + 200, area.h - 6);
  const w = Math.min(Math.max(320, rect.w), maxX - minX);
  const h = Math.min(Math.max(200, rect.h), maxY - minY);
  const x = Math.min(Math.max(minX, rect.x), maxX - w);
  const y = Math.min(Math.max(minY, rect.y), maxY - h);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function readSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const session = parsed as Partial<PersistedSession>;
    if (session.version !== 1 || !Array.isArray(session.windows)) return null;
    return session as PersistedSession;
  } catch {
    return null;
  }
}

function restoreWindows(session: PersistedSession | null, viewport: Viewport): WindowState[] {
  if (!session) return [];
  const restored: WindowState[] = [];
  session.windows.slice(0, MAX_WINDOWS).forEach((entry, index) => {
    if (!isAppId(entry.appId)) return;
    const meta = APP_META[entry.appId];
    const props =
      entry.props && typeof entry.props === 'object' ? (entry.props as WindowProps) : {};
    const hasRect =
      typeof entry.x === 'number' &&
      typeof entry.y === 'number' &&
      typeof entry.w === 'number' &&
      typeof entry.h === 'number';
    const base: WindowRect = hasRect
      ? clampRect({ x: entry.x!, y: entry.y!, w: entry.w!, h: entry.h! }, viewport)
      : clampRect(
          {
            x: Math.max(8, Math.round(viewport.width / 2 - meta.defaultSize.w / 2) + index * 24),
            y: 24 + index * 24,
            w: meta.defaultSize.w,
            h: meta.defaultSize.h,
          },
          viewport,
        );
    restored.push({
      ...base,
      id: nextId(),
      appId: entry.appId,
      z: index + 1,
      minimized: Boolean(entry.minimized),
      maximized: Boolean(entry.maximized),
      restoreRect: null,
      props,
    });
  });
  return restored;
}

export function WindowProvider({ children }: { children: ReactNode }): ReactNode {
  const viewport = useViewport();
  const initial = useRef<WindowState[] | null>(null);
  if (initial.current === null) {
    const session = readSession();
    initial.current = restoreWindows(session, viewport);
  }
  const [windows, setWindows] = useState<WindowState[]>(() => initial.current ?? []);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const list = initial.current ?? [];
    const top = [...list].sort((a, b) => b.z - a.z)[0];
    return top?.id ?? null;
  });
  const zRef = useRef(
    Math.max(1, ...((initial.current ?? []).map((w) => w.z) ?? [0])),
  );
  const guards = useRef(new Map<string, () => boolean>());
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const { say, t } = usePreferences();
  const { push } = useToast();

  // Persist session (debounced) whenever the layout changes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session: PersistedSession = {
        version: 1,
        windows: windows.map((w) => ({
          appId: w.appId,
          minimized: w.minimized,
          maximized: w.maximized,
          props: w.props,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
        })),
        activeId: null,
      };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        /* Layout persistence is best effort. */
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [windows]);

  const focusWindow = useCallback((id: string) => {
    setWindows((list) => {
      const target = list.find((w) => w.id === id);
      if (!target) return list;
      zRef.current += 1;
      return list.map((w) => (w.id === id ? { ...w, z: zRef.current, minimized: false } : w));
    });
    setActiveId(id);
  }, []);

  const openApp = useCallback(
    (appId: AppId, options: OpenOptions = {}): string | null => {
      const meta = APP_META[appId];
      const props = options.props ?? {};
      const existing = windowsRef.current.find(
        (w) =>
          w.appId === appId &&
          (!meta.singleton
            ? props.path !== undefined
              ? w.props.path === props.path
              : w.props.path === undefined
            : true),
      );
      if (existing && !options.forceNew) {
        // Re-opening a running app can hand it new parameters (path, cwd…).
        if (options.props && Object.keys(options.props).length > 0) {
          setWindows((list) =>
            list.map((win) =>
              win.id === existing.id
                ? { ...win, props: { ...win.props, ...options.props }, minimized: false }
                : win,
            ),
          );
        }
        focusWindow(existing.id);
        say('click');
        return existing.id;
      }
      if (windowsRef.current.length >= MAX_WINDOWS) {
        push(t('toast.maxWindows'), 'warning');
        say('error');
        return null;
      }
      zRef.current += 1;
      const index = windowsRef.current.length;
      const rect = clampRect(
        {
          x: Math.max(10, Math.round(viewport.width / 2 - meta.defaultSize.w / 2) + (index % 5) * 26),
          y: 26 + (index % 5) * 26,
          w: meta.defaultSize.w,
          h: meta.defaultSize.h,
        },
        viewport,
      );
      const id = nextId();
      const win: WindowState = {
        ...rect,
        id,
        appId,
        z: zRef.current,
        minimized: false,
        maximized: false,
        restoreRect: null,
        props,
      };
      setWindows((list) => [...list, win]);
      setActiveId(id);
      say('open');
      return id;
    },
    [focusWindow, push, say, t, viewport],
  );

  const removeWindow = useCallback(
    (id: string) => {
      guards.current.delete(id);
      setWindows((list) => {
        const next = list.filter((w) => w.id !== id);
        setActiveId((current) => {
          if (current !== id) return current;
          const top = [...next].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
          return top?.id ?? null;
        });
        return next;
      });
      say('close');
    },
    [say],
  );

  const closeWindow = useCallback(
    (id: string) => {
      const guard = guards.current.get(id);
      if (guard && !guard()) return;
      removeWindow(id);
    },
    [removeWindow],
  );

  const forceCloseWindow = useCallback(
    (id: string) => {
      removeWindow(id);
    },
    [removeWindow],
  );

  const minimizeWindow = useCallback(
    (id: string) => {
      setWindows((list) => list.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
      setActiveId((current) => (current === id ? null : current));
      say('close');
    },
    [say],
  );

  const toggleMaximize = useCallback(
    (id: string) => {
      setWindows((list) =>
        list.map((w) => {
          if (w.id !== id) return w;
          if (w.maximized) {
            const rect = w.restoreRect ?? clampRect(w, viewport);
            return { ...w, maximized: false, restoreRect: null, ...rect };
          }
          return {
            ...w,
            maximized: true,
            restoreRect: { x: w.x, y: w.y, w: w.w, h: w.h },
          };
        }),
      );
      say('toggle');
    },
    [say, viewport],
  );

  const setGeometry = useCallback(
    (id: string, rect: Partial<WindowRect>) => {
      setWindows((list) =>
        list.map((w) => {
          if (w.id !== id) return w;
          const merged = clampRect(
            {
              x: rect.x ?? w.x,
              y: rect.y ?? w.y,
              w: rect.w ?? w.w,
              h: rect.h ?? w.h,
            },
            viewport,
          );
          return { ...w, ...merged };
        }),
      );
    },
    [viewport],
  );

  const cycleWindows = useCallback((direction: 1 | -1) => {
    setWindows((list) => {
      const visible = list.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
      if (visible.length === 0) return list;
      const top = visible[0];
      if (!top) return list;
      const index = visible.findIndex((w) => w.id === top.id);
      const nextIndex = (index + direction + visible.length) % visible.length;
      const next = visible[nextIndex];
      if (!next) return list;
      zRef.current += 1;
      setActiveId(next.id);
      return list.map((w) =>
        w.id === next.id ? { ...w, z: zRef.current, minimized: false } : w,
      );
    });
  }, []);

  const minimizeAll = useCallback(() => {
    setWindows((list) => list.map((w) => ({ ...w, minimized: true })));
    setActiveId(null);
    say('close');
  }, [say]);

  const restoreAll = useCallback(() => {
    setWindows((list) => list.map((w) => ({ ...w, minimized: false })));
    const top = [...windowsRef.current].sort((a, b) => b.z - a.z)[0];
    if (top) setActiveId(top.id);
  }, []);

  const closeAll = useCallback(() => {
    guards.current.clear();
    setWindows([]);
    setActiveId(null);
    say('close');
  }, [say]);

  const resetSession = useCallback(() => {
    guards.current.clear();
    setWindows([]);
    setActiveId(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const registerCloseGuard = useCallback((id: string, guard: () => boolean) => {
    guards.current.set(id, guard);
    return () => {
      if (guards.current.get(id) === guard) guards.current.delete(id);
    };
  }, []);

  const windowTitle = useCallback(
    (win: WindowState): { name: string; detail?: string } => {
      const meta = APP_META[win.appId];
      const base = t(meta.nameKey);
      if (win.appId === 'editor') {
        const path = typeof win.props.path === 'string' ? win.props.path : undefined;
        if (path) {
          const name = path.slice(path.lastIndexOf('/') + 1);
          return { name: `${base} — ${name}`, detail: path };
        }
        return { name: base, detail: t('editor.untitled') };
      }
      return { name: base };
    },
    [t],
  );

  const activeWindow = useMemo(
    () => windows.find((w) => w.id === activeId) ?? null,
    [windows, activeId],
  );

  const value = useMemo<WindowContextValue>(
    () => ({
      windows,
      activeId,
      activeWindow,
      viewport,
      openApp,
      closeWindow,
      forceCloseWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      setGeometry,
      cycleWindows,
      minimizeAll,
      restoreAll,
      closeAll,
      resetSession,
      registerCloseGuard,
      windowTitle,
    }),
    [
      windows,
      activeId,
      activeWindow,
      viewport,
      openApp,
      closeWindow,
      forceCloseWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      setGeometry,
      cycleWindows,
      minimizeAll,
      restoreAll,
      closeAll,
      resetSession,
      registerCloseGuard,
      windowTitle,
    ],
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}

export function useWindows(): WindowContextValue {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error('useWindows must be used inside WindowProvider');
  return ctx;
}
