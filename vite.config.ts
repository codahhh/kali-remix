import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// KALI WEB OS is a static, offline-first PWA. No backend, no external APIs.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // The Arena preview proxy serves the app from its own host, so never
    // restrict by host/origin here.
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // The service worker lives in /public and precaches the hashed bundle.
    assetsInlineLimit: 2048,
  },
});
