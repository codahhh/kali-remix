import { build } from 'esbuild';

await build({
  entryPoints: ['scripts/logic-tests.mjs'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'scripts/.tmp/logic-tests.bundle.mjs',
  logLevel: 'warning',
});
