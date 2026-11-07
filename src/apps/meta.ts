import {
  Activity,
  FileText,
  Files,
  FlaskConical,
  Network,
  Settings,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from '../lib/types';
import type { TranslationKey } from '../lib/i18n';

export type AppCategory = 'system' | 'learning' | 'productivity';

export interface AppMeta {
  id: AppId;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  singleton: boolean;
  category: AppCategory;
  accentClass: string;
  pinned: boolean;
}

export const APP_META: Record<AppId, AppMeta> = {
  terminal: {
    id: 'terminal',
    nameKey: 'terminal.title',
    descriptionKey: 'terminal.subtitle',
    icon: TerminalSquare,
    defaultSize: { w: 720, h: 460 },
    minSize: { w: 380, h: 240 },
    singleton: true,
    category: 'system',
    accentClass: 'from-cyan-400/25 to-blue-500/10 text-cyan-300',
    pinned: true,
  },
  files: {
    id: 'files',
    nameKey: 'files.title',
    descriptionKey: 'files.infoHint',
    icon: Files,
    defaultSize: { w: 860, h: 540 },
    minSize: { w: 480, h: 320 },
    singleton: true,
    category: 'productivity',
    accentClass: 'from-sky-400/25 to-indigo-500/10 text-sky-300',
    pinned: true,
  },
  editor: {
    id: 'editor',
    nameKey: 'editor.title',
    descriptionKey: 'editor.saveHint',
    icon: FileText,
    defaultSize: { w: 760, h: 520 },
    minSize: { w: 400, h: 280 },
    singleton: false,
    category: 'productivity',
    accentClass: 'from-teal-300/25 to-emerald-500/10 text-teal-200',
    pinned: false,
  },
  lab: {
    id: 'lab',
    nameKey: 'lab.title',
    descriptionKey: 'lab.subtitle',
    icon: FlaskConical,
    defaultSize: { w: 940, h: 620 },
    minSize: { w: 480, h: 360 },
    singleton: true,
    category: 'learning',
    accentClass: 'from-emerald-300/25 to-cyan-500/10 text-emerald-300',
    pinned: true,
  },
  network: {
    id: 'network',
    nameKey: 'network.title',
    descriptionKey: 'network.subtitle',
    icon: Network,
    defaultSize: { w: 920, h: 600 },
    minSize: { w: 480, h: 360 },
    singleton: true,
    category: 'learning',
    accentClass: 'from-blue-400/25 to-cyan-500/10 text-blue-300',
    pinned: true,
  },
  monitor: {
    id: 'monitor',
    nameKey: 'monitor.title',
    descriptionKey: 'monitor.subtitle',
    icon: Activity,
    defaultSize: { w: 880, h: 580 },
    minSize: { w: 460, h: 340 },
    singleton: true,
    category: 'system',
    accentClass: 'from-violet-400/25 to-blue-500/10 text-violet-300',
    pinned: false,
  },
  settings: {
    id: 'settings',
    nameKey: 'settings.title',
    descriptionKey: 'settings.subtitle',
    icon: Settings,
    defaultSize: { w: 820, h: 600 },
    minSize: { w: 420, h: 380 },
    singleton: true,
    category: 'system',
    accentClass: 'from-slate-300/20 to-sky-500/10 text-slate-200',
    pinned: true,
  },
};

export const APP_ORDER: AppId[] = ['terminal', 'files', 'editor', 'lab', 'network', 'monitor', 'settings'];

export const DOCK_APPS: AppId[] = ['terminal', 'files', 'lab', 'network', 'monitor', 'settings'];

export function isAppId(value: unknown): value is AppId {
  return typeof value === 'string' && Object.hasOwn(APP_META, value);
}
