import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { useToast } from '../../state/ToastContext';
import { IconButton } from './IconButton';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export function Spinner({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-text-mid" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-accented" aria-hidden="true" />
      <span className="text-xs">{label ?? '…'}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-line text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
      ].join(' ')}
    >
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accented">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-hi">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-low">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const TOAST_STYLES = {
  info: { icon: Info, ring: 'border-surface-line', text: 'text-text-hi', accent: 'text-accented' },
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-400/30',
    text: 'text-text-hi',
    accent: 'text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    ring: 'border-amber-400/30',
    text: 'text-text-hi',
    accent: 'text-amber-300',
  },
  error: { icon: XCircle, ring: 'border-rose-400/30', text: 'text-text-hi', accent: 'text-rose-300' },
} as const;

export function ToastHost(): ReactNode {
  const { toasts, dismiss } = useToast();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--dock-height)+var(--safe-bottom)+16px)] z-[180] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-5"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-win px-3.5 py-3 shadow-win animate-toast-in',
              style.ring,
            ].join(' ')}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.accent}`} aria-hidden="true" />
            <p className={`flex-1 text-[13px] leading-snug ${style.text}`}>{toast.message}</p>
            <IconButton label="Dismiss" size="sm" onClick={() => dismiss(toast.id)}>
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
