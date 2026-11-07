import type { ComponentType } from 'react';
import type { AppId, WindowProps } from '../lib/types';
import { TerminalApp } from './terminal/TerminalApp';
import { FilesApp } from './files/FilesApp';
import { EditorApp } from './editor/EditorApp';
import { CyberLabApp } from './lab/CyberLabApp';
import { NetworkApp } from './network/NetworkApp';
import { MonitorApp } from './monitor/MonitorApp';
import { SettingsApp } from './settings/SettingsApp';

export interface AppProps {
  windowId: string;
  initialProps: WindowProps;
}

/**
 * Every application is a self-contained component. They only talk to the
 * shared state (filesystem, preferences, window manager) through contexts.
 */
export const APP_COMPONENTS: Record<AppId, ComponentType<AppProps>> = {
  terminal: TerminalApp,
  files: FilesApp,
  editor: EditorApp,
  lab: CyberLabApp,
  network: NetworkApp,
  monitor: MonitorApp,
  settings: SettingsApp,
};
