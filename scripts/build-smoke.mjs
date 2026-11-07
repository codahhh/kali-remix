import { build } from 'esbuild';

await build({
  entryPoints: ['scripts/smoke.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  jsx: 'automatic',
  outfile: 'scripts/.tmp/smoke.bundle.mjs',
  external: ['jsdom'],
  define: { 'process.env.NODE_ENV': '"development"' },
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  logLevel: 'warning',
});
