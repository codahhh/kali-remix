import type { Lang } from './types';

export interface LocalizedText {
  en: string;
  fr: string;
}

export function localized(text: LocalizedText | undefined, lang: Lang): string {
  if (!text) return '';
  return text[lang] || text.en;
}
