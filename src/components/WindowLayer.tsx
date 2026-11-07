import type { ReactNode } from 'react';
import { useWindows } from '../state/WindowContext';
import { WindowFrame } from './WindowFrame';

export function WindowLayer(): ReactNode {
  const { windows, activeId, viewport } = useWindows();

  const ordered = windows.slice().sort((a, b) => a.z - b.z);
  const visible = viewport.isDesktop
    ? ordered.filter((win) => !win.minimized)
    : ordered.filter((win) => !win.minimized && win.id === activeId).slice(-1);

  return (
    <>
      {visible.map((win) => (
        <WindowFrame key={win.id} win={win} isActive={win.id === activeId} />
      ))}
    </>
  );
}
