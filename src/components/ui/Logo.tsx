import type { ReactNode } from 'react';

/**
 * The KALI WEB OS emblem: an original geometric "K" inside a hexagon.
 * It deliberately does not reproduce the Kali Linux dragon logo.
 */
export function Logo({
  className = 'h-6 w-6',
  title,
}: {
  className?: string;
  title?: string;
}): ReactNode {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id="logo-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-2, #5ee7ff)" />
          <stop offset="100%" stopColor="var(--accent, #2b8fff)" />
        </linearGradient>
        <linearGradient id="logo-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="var(--accent-2, #5ee7ff)" />
        </linearGradient>
      </defs>
      <path
        d="M256 44 424 140v232L256 468 88 372V140z"
        fill="none"
        stroke="url(#logo-edge)"
        strokeWidth="26"
        strokeLinejoin="round"
      />
      <path
        d="M256 104 372 170v172l-116 66-116-66V170z"
        fill="none"
        stroke="var(--accent, #2b8fff)"
        strokeOpacity="0.28"
        strokeWidth="8"
      />
      <path
        d="M198 168v176M198 256l92-74M198 256l98 74"
        fill="none"
        stroke="url(#logo-mark)"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWordmark({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <span className="flex items-center gap-2">
      <Logo className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      <span className="flex items-baseline gap-1 font-display">
        <span className="font-bold tracking-[0.18em] text-text-hi">KALI</span>
        {!compact ? (
          <span className="text-[10px] font-semibold tracking-[0.32em] text-accented/90">
            WEB OS
          </span>
        ) : null}
      </span>
    </span>
  );
}
