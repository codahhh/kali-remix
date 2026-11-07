import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  active?: boolean;
  tone?: 'default' | 'danger';
  children: ReactNode;
}

export function IconButton({
  label,
  size = 'md',
  active = false,
  tone = 'default',
  className = '',
  children,
  type = 'button',
  ...rest
}: IconButtonProps): ReactNode {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={rest['aria-pressed']}
      className={[
        'inline-grid place-items-center rounded-lg transition-colors duration-150 focus-ring',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        active
          ? 'bg-accent/20 text-accented'
          : tone === 'danger'
            ? 'text-text-mid hover:bg-rose-500/20 hover:text-rose-300'
            : 'text-text-mid hover:bg-surface-hover hover:text-text-hi',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
