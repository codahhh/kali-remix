import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Maximize2, Minus, Minimize2, X } from 'lucide-react';
import { APP_COMPONENTS } from '../apps/registry';
import { APP_META } from '../apps/meta';
import {
  MAXIMIZED_BOTTOM_GAP,
  MOBILE_NAV_HEIGHT,
  useWindows,
} from '../state/WindowContext';
import { usePreferences } from '../state/PreferencesContext';
import { AppIcon } from './AppIcon';
import type { WindowRect, WindowState } from '../lib/types';

interface WindowFrameProps {
  win: WindowState;
  isActive: boolean;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_CLASSES: Record<ResizeEdge, string> = {
  n: 'left-2 right-2 top-0 h-1.5 cursor-ns-resize',
  s: 'left-2 right-2 bottom-0 h-1.5 cursor-ns-resize',
  e: 'top-2 bottom-2 right-0 w-1.5 cursor-ew-resize',
  w: 'top-2 bottom-2 left-0 w-1.5 cursor-ew-resize',
  ne: 'right-0 top-0 h-3 w-3 cursor-nesw-resize',
  nw: 'left-0 top-0 h-3 w-3 cursor-nwse-resize',
  se: 'right-0 bottom-0 h-3.5 w-3.5 cursor-nwse-resize',
  sw: 'left-0 bottom-0 h-3 w-3 cursor-nesw-resize',
};

const EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

export function WindowFrame({ win, isActive }: WindowFrameProps): ReactNode {
  const {
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    setGeometry,
    viewport,
    activeId,
    windowTitle,
  } = useWindows();
  const { t, prefs } = usePreferences();
  const meta = APP_META[win.appId];
  const title = windowTitle(win);
  const AppComponent = APP_COMPONENTS[win.appId];
  const titleId = useId();
  const dragRef = useRef<{ x: number; y: number; rect: WindowRect } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; rect: WindowRect; edge: ResizeEdge } | null>(
    null,
  );
  const frameRef = useRef<HTMLDivElement>(null);

  const isDesktop = viewport.isDesktop;
  const isMaximized = isDesktop && win.maximized;

  useEffect(() => {
    // Return keyboard focus to the frame when its window becomes active and
    // focus was lost (e.g. after closing a dialog inside it).
    if (isActive && frameRef.current && document.activeElement === document.body) {
      frameRef.current.focus({ preventScroll: true });
    }
  }, [isActive, activeId]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isDesktop || isMaximized) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-window-control]')) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      rect: { x: win.x, y: win.y, w: win.w, h: win.h },
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onDragMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    setGeometry(win.id, { x: drag.rect.x + dx, y: drag.rect.y + dy });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const startResize = (edge: ResizeEdge) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDesktop || isMaximized) return;
    event.stopPropagation();
    event.preventDefault();
    resizeRef.current = {
      x: event.clientX,
      y: event.clientY,
      rect: { x: win.x, y: win.y, w: win.w, h: win.h },
      edge,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    focusWindow(win.id);
  };

  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const resize = resizeRef.current;
    if (!resize) return;
    const dx = event.clientX - resize.x;
    const dy = event.clientY - resize.y;
    const min = meta.minSize;
    let { x, y, w, h } = resize.rect;

    if (resize.edge.includes('e')) w = Math.max(min.w, resize.rect.w + dx);
    if (resize.edge.includes('s')) h = Math.max(min.h, resize.rect.h + dy);
    if (resize.edge.includes('w')) {
      w = Math.max(min.w, resize.rect.w - dx);
      x = resize.rect.x + (resize.rect.w - w);
    }
    if (resize.edge.includes('n')) {
      h = Math.max(min.h, resize.rect.h - dy);
      y = resize.rect.y + (resize.rect.h - h);
    }
    setGeometry(win.id, { x, y, w, h });
  };

  const endResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const area = {
    w: viewport.width,
    h: Math.max(240, viewport.height - 34 - (isDesktop ? 0 : MOBILE_NAV_HEIGHT)),
  };
  const rect = isMaximized
    ? { x: 0, y: 0, w: area.w, h: Math.max(220, area.h - MAXIMIZED_BOTTOM_GAP) }
    : isDesktop
      ? { x: win.x, y: win.y, w: win.w, h: win.h }
      : { x: 0, y: 0, w: area.w, h: area.h };

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal={false}
      tabIndex={-1}
      style={
        isDesktop
          ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 10 + win.z }
          : { left: 0, top: 0, width: '100%', height: '100%', zIndex: 10 + win.z }
      }
      onPointerDownCapture={() => {
        if (!isActive) focusWindow(win.id);
      }}
      onFocusCapture={() => {
        if (!isActive) focusWindow(win.id);
      }}
      className={[
        'absolute flex flex-col overflow-hidden outline-none',
        isDesktop
          ? 'rounded-xl border animate-win-in'
          : 'rounded-none border-x-0 border-b-0 animate-slide-up',
        isActive
          ? 'border-accent/40 shadow-win-focus'
          : 'border-white/10 shadow-win',
        'bg-surface-win',
      ].join(' ')}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => {
          if (isDesktop) toggleMaximize(win.id);
        }}
        className={[
          'flex shrink-0 select-none items-center gap-2 border-b px-2.5',
          isDesktop ? 'cursor-grab active:cursor-grabbing' : '',
          isActive
            ? 'border-surface-line bg-gradient-to-b from-white/[0.07] to-transparent'
            : 'border-surface-line/70 bg-surface-soft',
          isDesktop ? 'h-9' : 'h-12',
        ].join(' ')}
        style={!isDesktop ? { paddingTop: 0 } : undefined}
      >
        <AppIcon appId={win.appId} size="sm" className="!h-4 !w-4 !rounded" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-[12px] font-semibold text-text-hi">
            {title.name}
          </h2>
        </div>

        <div className="flex items-center gap-0.5" data-window-control>
          <button
            type="button"
            onClick={() => minimizeWindow(win.id)}
            aria-label={`${t('desktop.minimize')} — ${title.name}`}
            className="grid h-7 w-7 place-items-center rounded-md text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {isDesktop ? (
            <button
              type="button"
              onClick={() => toggleMaximize(win.id)}
              aria-label={`${isMaximized ? t('desktop.restore') : t('desktop.maximize')} — ${title.name}`}
              className="grid h-7 w-7 place-items-center rounded-md text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => closeWindow(win.id)}
            aria-label={`${t('desktop.closeWindow')} — ${title.name}`}
            className="grid h-7 w-7 place-items-center rounded-md text-text-mid transition hover:bg-rose-500/25 hover:text-rose-200 focus-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AppComponent windowId={win.id} initialProps={win.props} />
      </div>

      {isDesktop && !isMaximized
        ? EDGES.map((edge) => (
            <div
              key={edge}
              role="presentation"
              onPointerDown={startResize(edge)}
              onPointerMove={onResizeMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              className={`absolute z-20 touch-none ${EDGE_CLASSES[edge]}`}
            />
          ))
        : null}

      {prefs.reduceMotion ? null : (
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity',
            isActive ? 'bg-gradient-to-r from-transparent via-accent/60 to-transparent' : 'opacity-0',
          ].join(' ')}
        />
      )}
    </div>
  );
}
