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
import {
  applyThemeToDocument,
  clearPreferences,
  defaultPreferences,
  loadPreferences,
  savePreferences,
} from '../lib/prefs';
import { localeFor, translate, type TranslationKey, type Translator } from '../lib/i18n';
import { playTone } from '../lib/sound';
import type { Lang, Preferences } from '../lib/types';

interface PreferencesContextValue {
  prefs: Preferences;
  t: Translator;
  lang: Lang;
  locale: string;
  storageOk: boolean;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  updatePrefs: (patch: Partial<Preferences>) => void;
  resetPreferences: () => void;
  say: (tone: 'open' | 'close' | 'click' | 'toggle' | 'error' | 'success') => void;
  setLanguage: (lang: Lang) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }): ReactNode {
  const [{ prefs, ok: storageOk }] = useState(loadPreferences);
  const [state, setState] = useState<Preferences>(prefs);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    applyThemeToDocument(state);
    if (!savePreferences(state)) {
      /* Storage can be unavailable in private modes; the UI keeps working. */
    }
  }, [state]);

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    clearPreferences();
    setState(defaultPreferences());
  }, []);

  const say = useCallback((tone: 'open' | 'close' | 'click' | 'toggle' | 'error' | 'success') => {
    playTone(tone, stateRef.current.sound);
  }, []);

  const setLanguage = useCallback((lang: Lang) => {
    setState((prev) => ({ ...prev, lang }));
  }, []);

  const t = useCallback<Translator>(
    (key: TranslationKey, vars) => translate(stateRef.current.lang, key, vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.lang],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs: state,
      t,
      lang: state.lang,
      locale: localeFor(state.lang),
      storageOk,
      setPref,
      updatePrefs,
      resetPreferences,
      say,
      setLanguage,
    }),
    [state, t, storageOk, setPref, updatePrefs, resetPreferences, say, setLanguage],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}

/** Convenience: just the translator. */
export function useT(): Translator {
  return usePreferences().t;
}
