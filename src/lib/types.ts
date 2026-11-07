/**
 * Shared domain types for KALI WEB OS.
 * Everything in this app is a browser-side simulation — no host OS access.
 */

export type Lang = 'en' | 'fr';
export type ThemeMode = 'dark' | 'light';
export type WallpaperId = 'onyx' | 'abyss' | 'grid' | 'aurora' | 'carbon' | 'steel';
export type AccentId = 'kali' | 'cyan' | 'azure' | 'violet' | 'emerald' | 'amber' | 'crimson';

export type AppId =
  | 'terminal'
  | 'files'
  | 'editor'
  | 'lab'
  | 'network'
  | 'monitor'
  | 'settings';

export interface Preferences {
  lang: Lang;
  theme: ThemeMode;
  wallpaper: WallpaperId;
  accent: AccentId;
  terminalFontSize: number;
  sound: boolean;
  reduceMotion: boolean;
  showSeconds: boolean;
  /** First-run hints that the user already dismissed. */
  dismissedHints: string[];
}

export type WindowProps = Record<string, string | number | boolean | undefined>;

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowState extends WindowRect {
  id: string;
  appId: AppId;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Rect to restore when un-maximizing. */
  restoreRect: WindowRect | null;
  props: WindowProps;
}

export interface PersistedSession {
  version: 1;
  windows: Array<
    Pick<WindowState, 'appId' | 'minimized' | 'maximized' | 'props'> & Partial<WindowRect>
  >;
  activeId: string | null;
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}
