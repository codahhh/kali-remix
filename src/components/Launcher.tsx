import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Command, Search, X } from 'lucide-react';
import { APP_META, APP_ORDER, type AppCategory } from '../apps/meta';
import { usePreferences } from '../state/PreferencesContext';
import { useWindows } from '../state/WindowContext';
import { AppIcon } from './AppIcon';
import { Badge } from './ui/Controls';
import { Logo } from './ui/Logo';
import type { AppId } from '../lib/types';

interface LauncherProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<AppCategory | 'all', { en: string; fr: string }> = {
  all: { en: 'All', fr: 'Tout' },
  system: { en: 'System', fr: 'Système' },
  learning: { en: 'Learning', fr: 'Apprentissage' },
  productivity: { en: 'Productivity', fr: 'Productivité' },
};

export function Launcher({ open, onClose }: LauncherProps): ReactNode {
  const { t, prefs } = usePreferences();
  const { openApp, windows, focusWindow } = useWindows();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory('all');
    setHighlight(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return APP_ORDER.filter((id) => {
      const meta = APP_META[id];
      if (category !== 'all' && meta.category !== category) return false;
      if (!q) return true;
      const haystack = `${t(meta.nameKey)} ${t(meta.descriptionKey)} ${id} ${t(meta.nameKey)}`
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [category, query, t]);

  useEffect(() => {
    setHighlight(0);
  }, [query, category]);

  const launch = (id: AppId): void => {
    openApp(id);
    onClose();
  };

  if (!open) return null;

  const runningIds = new Set(windows.map((w) => w.appId));

  return (
    <div
      className="absolute inset-0 z-[120] flex flex-col bg-ink-1/55 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={t('desktop.launcher')}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 pb-28 pt-6 sm:px-8 sm:pt-10"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((h) => Math.min(results.length - 1, h + 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          } else if (event.key === 'Enter' && results.length > 0) {
            event.preventDefault();
            const target = results[highlight] ?? results[0];
            if (target) launch(target);
          }
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accented/80">
                {t('desktop.activities')}
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-text-hi">
                {t('desktop.allApps')}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid h-9 w-9 place-items-center rounded-lg border border-surface-line bg-surface-soft text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-low"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('desktop.searchApps')}
              aria-label={t('desktop.searchApps')}
              role="combobox"
              aria-expanded="true"
              aria-controls="launcher-results"
              aria-autocomplete="list"
              className="h-11 w-full rounded-xl border border-surface-line bg-surface-win/80 pl-10 pr-3 text-sm text-text-hi shadow-inner outline-none transition placeholder:text-text-low focus:border-accent/60 focus:bg-surface-win"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'system', 'learning', 'productivity'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={category === cat}
                className={[
                  'h-8 rounded-lg border px-3 text-xs font-medium transition focus-ring',
                  category === cat
                    ? 'border-accent/40 bg-accent/15 text-accented'
                    : 'border-surface-line bg-surface-soft/60 text-text-mid hover:text-text-hi',
                ].join(' ')}
              >
                {CATEGORY_LABEL[cat][prefs.lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto kali-scroll" id="launcher-results" role="listbox" aria-label={t('desktop.allApps')}>
          {results.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="text-sm text-text-mid">{t('desktop.noResults', { query })}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((id, index) => {
                const meta = APP_META[id];
                const running = runningIds.has(id);
                const active = index === highlight;
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => launch(id)}
                    className={[
                      'group flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-ring',
                      active
                        ? 'border-accent/45 bg-accent/10 shadow-glow'
                        : 'border-surface-line bg-surface-win/65 hover:border-surface-line hover:bg-surface-hover',
                    ].join(' ')}
                  >
                    <AppIcon appId={id} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold text-text-hi">
                          {t(meta.nameKey)}
                        </span>
                        {running ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                            aria-label={t('common.inProgress')}
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-low">
                        {t(meta.descriptionKey)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {windows.length > 0 ? (
            <div className="mt-2 border-t border-surface-line pt-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-low">
                  {t('desktop.openWindows')}
                </p>
                <Badge tone="neutral">{windows.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {windows.map((win) => {
                  const meta = APP_META[win.appId];
                  return (
                    <button
                      key={win.id}
                      type="button"
                      onClick={() => {
                        focusWindow(win.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-line bg-surface-soft/70 px-2.5 py-1.5 text-xs text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
                    >
                      <AppIcon appId={win.appId} size="xs" />
                      {t(meta.nameKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-text-low">
          <span className="inline-flex items-center gap-1.5">
            <Command className="h-3 w-3" aria-hidden="true" /> K / Ctrl+K · {t('desktop.launcher')}
          </span>
          <span className="hidden sm:inline">Esc · {t('common.close')}</span>
        </div>
      </div>
    </div>
  );
}
