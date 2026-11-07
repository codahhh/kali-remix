import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeLabel?: string;
  dismissible?: boolean;
  icon?: ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'sm',
  closeLabel = 'Close',
  dismissible = true,
  icon,
}: ModalProps): ReactNode {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusFirst = (): void => {
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    };
    const id = window.setTimeout(focusFirst, 30);

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={() => dismissible && onClose()}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[3px] animate-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={[
          'win-surface relative z-10 w-full overflow-hidden rounded-t-2xl border border-surface-line sm:rounded-2xl',
          'animate-slide-up sm:animate-pop-in',
          SIZES[size],
        ].join(' ')}
      >
        <div className="flex items-start gap-3 border-b border-surface-line px-5 py-4">
          {icon ? (
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accented">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-text-hi">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-xs leading-relaxed text-text-mid">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <IconButton label={closeLabel} onClick={onClose} size="sm">
              <X className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,32rem)] overflow-y-auto px-5 py-4 kali-scroll">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-line bg-surface-soft/40 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
