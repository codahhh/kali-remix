import type { ReactNode } from 'react';
import { APP_META } from '../apps/meta';
import type { AppId } from '../lib/types';

const SIZES = {
  xs: 'h-7 w-7 rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5',
  sm: 'h-9 w-9 rounded-lg [&>svg]:h-4 [&>svg]:w-4',
  md: 'h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5',
  lg: 'h-14 w-14 rounded-2xl [&>svg]:h-7 [&>svg]:w-7',
  xl: 'h-16 w-16 rounded-2xl [&>svg]:h-8 [&>svg]:w-8',
} as const;

export function AppIcon({
  appId,
  size = 'md',
  className = '',
}: {
  appId: AppId;
  size?: keyof typeof SIZES;
  className?: string;
}): ReactNode {
  const meta = APP_META[appId];
  const Icon = meta.icon;
  return (
    <span
      aria-hidden="true"
      className={[
        'relative grid shrink-0 place-items-center border border-white/10 bg-gradient-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
        meta.accentClass,
        SIZES[size],
        className,
      ].join(' ')}
    >
      <Icon strokeWidth={1.7} />
    </span>
  );
}
