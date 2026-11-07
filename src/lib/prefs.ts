import type { AccentId, Lang, Preferences, ThemeMode, WallpaperId } from './types';
import type { TranslationKey } from './i18n';

export const PREFS_KEY = 'kaliwebos.prefs.v1';
export const PREFS_VERSION = 1;

export const ACCENTS: Record<AccentId, { accent: string; accent2: string; labelKey: TranslationKey }> = {
  kali: { accent: '56 143 255', accent2: '94 231 255', labelKey: 'settings.options.accent.kali' },
  cyan: { accent: '34 211 238', accent2: '125 245 255', labelKey: 'settings.options.accent.cyan' },
  azure: { accent: '59 130 246', accent2: '147 197 253', labelKey: 'settings.options.accent.azure' },
  violet: { accent: '139 92 246', accent2: '196 181 253', labelKey: 'settings.options.accent.violet' },
  emerald: { accent: '16 185 129', accent2: '110 231 183', labelKey: 'settings.options.accent.emerald' },
  amber: { accent: '245 158 11', accent2: '253 224 71', labelKey: 'settings.options.accent.amber' },
  crimson: { accent: '244 63 94', accent2: '253 164 175', labelKey: 'settings.options.accent.crimson' },
};

export const WALLPAPERS: Array<{ id: WallpaperId; labelKey: TranslationKey }> = [
  { id: 'onyx', labelKey: 'settings.options.wallpaper.onyx' },
  { id: 'abyss', labelKey: 'settings.options.wallpaper.abyss' },
  { id: 'grid', labelKey: 'settings.options.wallpaper.grid' },
  { id: 'aurora', labelKey: 'settings.options.wallpaper.aurora' },
  { id: 'carbon', labelKey: 'settings.options.wallpaper.carbon' },
  { id: 'steel', labelKey: 'settings.options.wallpaper.steel' },
];

export const TERMINAL_FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20] as const;

function detectLang(): Lang {
  try {
    const candidates = [navigator.language, ...(navigator.languages ?? [])];
    return candidates.some((l) => typeof l === 'string' && l.toLowerCase().startsWith('fr'))
      ? 'fr'
      : 'en';
  } catch {
    return 'en';
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function prefersLightTheme(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
}

export function defaultPreferences(): Preferences {
  return {
    lang: detectLang(),
    // First visit follows the OS colour scheme; the choice is explicit afterwards.
    theme: prefersLightTheme() ? 'light' : 'dark',
    wallpaper: 'onyx',
    accent: 'kali',
    terminalFontSize: 14,
    sound: true,
    reduceMotion: prefersReducedMotion(),
    showSeconds: false,
    dismissedHints: [],
  };
}

const LANGS: Lang[] = ['en', 'fr'];
const THEMES: ThemeMode[] = ['dark', 'light'];
const WALLPAPER_IDS = WALLPAPERS.map((w) => w.id);
const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Defensive parse: unknown or corrupt preferences fall back to defaults. */
export function sanitizePreferences(input: unknown): Preferences {
  const base = defaultPreferences();
  if (typeof input !== 'object' || input === null) return base;
  const raw = input as Record<string, unknown>;
  const size = typeof raw.terminalFontSize === 'number' ? raw.terminalFontSize : base.terminalFontSize;
  const clamped = Math.min(20, Math.max(11, Math.round(Number.isFinite(size) ? size : 14)));
  return {
    lang: pick(raw.lang, LANGS, base.lang),
    theme: pick(raw.theme, THEMES, base.theme),
    wallpaper: pick(raw.wallpaper, WALLPAPER_IDS, base.wallpaper),
    accent: pick(raw.accent, ACCENT_IDS, base.accent),
    terminalFontSize: clamped,
    sound: typeof raw.sound === 'boolean' ? raw.sound : base.sound,
    reduceMotion: typeof raw.reduceMotion === 'boolean' ? raw.reduceMotion : base.reduceMotion,
    showSeconds: typeof raw.showSeconds === 'boolean' ? raw.showSeconds : base.showSeconds,
    dismissedHints: Array.isArray(raw.dismissedHints)
      ? raw.dismissedHints.filter((h): h is string => typeof h === 'string').slice(0, 50)
      : [],
  };
}

export interface LoadResult {
  prefs: Preferences;
  ok: boolean;
}

export function loadPreferences(): LoadResult {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { prefs: defaultPreferences(), ok: true };
    const parsed: unknown = JSON.parse(raw);
    return { prefs: sanitizePreferences(parsed), ok: true };
  } catch {
    return { prefs: defaultPreferences(), ok: false };
  }
}

export function savePreferences(prefs: Preferences): boolean {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, version: PREFS_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    /* ignore */
  }
}

type Rgb = [number, number, number];

function parseRgb(triplet: string): Rgb {
  const parts = triplet.trim().split(/\s+/).map(Number);
  return [parts[0] ?? 56, parts[1] ?? 143, parts[2] ?? 255];
}

function formatRgb(rgb: Rgb): string {
  return rgb.map((channel) => Math.round(channel)).join(' ');
}

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Darken an accent until it stays readable on a light surface. */
function darkenUntil(rgb: Rgb, maxLuminance: number): Rgb {
  let current: Rgb = [...rgb];
  while (luminance(current) > maxLuminance) {
    const next = current.map((channel) => channel * 0.92) as Rgb;
    if (next[0] < 6 && next[1] < 6 && next[2] < 6) return next;
    current = next;
  }
  return current;
}

export function applyThemeToDocument(prefs: Preferences): void {
  const root = document.documentElement;
  const accent = ACCENTS[prefs.accent] ?? ACCENTS.kali;
  const light = prefs.theme === 'light';
  const primary = light ? darkenUntil(parseRgb(accent.accent), 0.14) : parseRgb(accent.accent);
  const secondary = light ? darkenUntil(parseRgb(accent.accent2), 0.2) : parseRgb(accent.accent2);
  root.dataset.theme = prefs.theme;
  root.dataset.wallpaper = prefs.wallpaper;
  root.dataset.accent = prefs.accent;
  root.dataset.motion = prefs.reduceMotion ? 'reduced' : 'full';
  root.lang = prefs.lang;
  root.style.setProperty('--accent', formatRgb(primary));
  root.style.setProperty('--accent-2', formatRgb(secondary));
  // Text drawn on top of the accent fill flips to stay legible on both themes.
  root.style.setProperty('--accent-contrast', luminance(primary) > 0.3 ? '3 10 20' : '247 251 255');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', prefs.theme === 'light' ? '#eef3fa' : '#070b14');
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute('content', prefs.theme === 'light' ? 'light' : 'dark');
}
