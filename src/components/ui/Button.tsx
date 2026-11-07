import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-[color:var(--accent-contrast)] hover:brightness-110 active:brightness-95 border border-transparent shadow-[0_6px_20px_-10px_rgb(var(--accent)/0.9)] font-semibold',
  secondary:
    'bg-surface-soft text-text-hi border border-surface-line hover:bg-surface-hover active:brightness-95',
  ghost:
    'bg-transparent text-text-mid border border-transparent hover:bg-surface-soft hover:text-text-hi',
  danger:
    'bg-rose-500/90 text-white hover:bg-rose-500 border border-rose-400/40 font-semibold',
  subtle: 'bg-accent/10 text-accented border border-accent/25 hover:bg-accent/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      className={[
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150 focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      {children}
      {iconRight ? <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconRight}</span> : null}
    </button>
  );
}
