import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * One self-contained ES module for Home Assistant: `dist/cuttleskin-ha-card.js`. The cuttleskin
 * runtime is built in from its source in `vendor/cuttleskin-runtime/` (a copy of
 * https://github.com/byteAgenten/cuttleskin-runtime), without obfuscation.
 */
export default defineConfig({
  entry: { 'cuttleskin-ha-card': 'src/index.ts' },
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  dts: false,
  // The `paths` of tsconfig.json are for type checking; bundling uses the alias
  tsconfig: false,
  alias: {
    '@cuttleskin/runtime': source('vendor/cuttleskin-runtime/src/index.ts'),
    '@cuttleskin/config': source('vendor/cuttleskin-runtime/config/index.ts'),
  },
  // Home Assistant serves `/local/*.js` as JavaScript; `.mjs` is not needed
  outExtensions: () => ({ js: '.js' }),
});
