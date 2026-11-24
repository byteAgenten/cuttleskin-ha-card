import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

/**
 * One self-contained ES module for Home Assistant: `dist/cuttleskin-ha-card.js`. The cuttleskin
 * runtime comes prebuilt (minified and obfuscated) from `vendor/` and is bundled in.
 */
export default defineConfig({
  entry: { 'cuttleskin-ha-card': 'src/index.ts' },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  dts: false,
  // The `paths` of tsconfig.json point at the type declarations; bundling uses the alias
  tsconfig: false,
  alias: {
    '@cuttleskin/runtime': fileURLToPath(new URL('vendor/cuttleskin-runtime.js', import.meta.url)),
  },
  // Home Assistant serves `/local/*.js` as JavaScript; `.mjs` is not needed
  outExtensions: () => ({ js: '.js' }),
});
