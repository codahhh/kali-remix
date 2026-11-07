/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accented: 'rgb(var(--accent-2) / <alpha-value>)',
        ink: {
          0: 'rgb(var(--ink-0-rgb) / <alpha-value>)',
          1: 'rgb(var(--ink-1-rgb) / <alpha-value>)',
          2: 'rgb(var(--ink-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--ink-3-rgb) / <alpha-value>)',
        },
        surface: {
          panel: 'var(--panel)',
          bar: 'var(--bar)',
          win: 'rgb(var(--win-rgb) / <alpha-value>)',
          soft: 'rgb(var(--soft-rgb) / calc(var(--soft-alpha) * <alpha-value>))',
          hover: 'rgb(var(--hover-rgb) / calc(var(--hover-alpha) * <alpha-value>))',
          line: 'rgb(var(--line-rgb) / calc(var(--line-alpha) * <alpha-value>))',
        },
        text: {
          hi: 'rgb(var(--text-hi-rgb) / <alpha-value>)',
          mid: 'rgb(var(--text-mid-rgb) / <alpha-value>)',
          low: 'rgb(var(--text-low-rgb) / <alpha-value>)',
          invert: 'rgb(var(--text-invert-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Cascadia Code',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
        display: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        win: '0 24px 60px -12px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(255 255 255 / 0.06)',
        'win-focus': '0 30px 80px -16px rgb(0 0 0 / 0.75), 0 0 0 1px rgb(68 209 255 / 0.25)',
        dock: '0 -10px 40px -12px rgb(0 0 0 / 0.8)',
        glow: '0 0 24px -4px rgb(var(--accent) / 0.55)',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'win-in': {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(14px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseglow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateX(-10%)' },
          '100%': { transform: 'translateX(110%)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        dash: {
          to: { strokeDashoffset: '-32' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'pop-in': 'pop-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'win-in': 'win-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slide-down 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in': 'toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        pulseglow: 'pulseglow 2.6s ease-in-out infinite',
        scan: 'scan 3.2s linear infinite',
        blink: 'blink 1.1s step-end infinite',
        dash: 'dash 1s linear infinite',
      },
    },
  },
  plugins: [],
};
