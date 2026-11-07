import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ Toggle */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, id }: ToggleProps): ReactNode {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text-hi">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-text-low">{description}</div> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 focus-ring',
          checked
            ? 'border-accent/70 bg-accent/80'
            : 'border-surface-line bg-surface-soft hover:bg-surface-hover',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-200',
            checked
              ? 'left-[calc(100%-1.25rem)] bg-ink-0'
              : 'left-[3px] bg-text-mid',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Segmented */
interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Accessible name when the visible label is empty (icon-only options). */
  ariaLabel?: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedProps<T>): ReactNode {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-surface-line bg-surface-soft p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel ?? (option.label || undefined)}
            title={option.ariaLabel ?? undefined}
            onClick={() => onChange(option.value)}
            className={[
              'inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-all duration-150 focus-ring',
              size === 'sm' ? 'h-7 px-2 text-[11px]' : 'h-8 px-3 text-xs',
              active
                ? 'bg-accent/20 text-accented shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.35)]'
                : 'text-text-mid hover:text-text-hi',
            ].join(' ')}
          >
            {option.icon ? <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{option.icon}</span> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- RangeField */
interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  hint,
}: RangeFieldProps): ReactNode {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-medium text-text-hi" htmlFor={`range-${label}`}>
          {label}
        </label>
        <span className="rounded-md bg-surface-soft px-2 py-0.5 font-mono text-[11px] text-accented">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <input
        id={`range-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-6 w-full cursor-pointer appearance-none bg-transparent focus-ring [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-surface-hover [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgb(var(--accent)/0.2)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-surface-hover [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
      />
      {hint ? <p className="mt-1 text-xs text-text-low">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------- SettingRow */
interface SettingRowProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingRow({ title, description, children }: SettingRowProps): ReactNode {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text-hi">{title}</div>
        {description ? (
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-text-low">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */
type BadgeTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'sim';

const BADGE_TONES: Record<BadgeTone, string> = {
  accent: 'bg-accent/15 text-accented border-accent/30',
  neutral: 'bg-surface-soft text-text-mid border-surface-line',
  success: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-400/12 text-amber-300 border-amber-400/30',
  danger: 'bg-rose-500/12 text-rose-300 border-rose-400/30',
  sim: 'bg-violet-400/12 text-violet-300 border-violet-400/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}): ReactNode {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        BADGE_TONES[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Card */
export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}): ReactNode {
  return (
    <Tag
      className={[
        'rounded-xl border border-surface-line bg-surface-soft/60 p-4',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------ ProgressBar */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  label: string;
  tone?: 'accent' | 'warning' | 'danger';
}): ReactNode {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const color =
    tone === 'danger' ? 'bg-rose-500' : tone === 'warning' ? 'bg-amber-400' : 'bg-accent';
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover"
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-500 ease-snap`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
