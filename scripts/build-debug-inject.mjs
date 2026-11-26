/**
 * Gera dist/debug/inject.js: o mesmo engine do content script, sem a API
 * de extensão, para colar no console de uma aba do instagram.com e
 * verificar os seletores na página real (ver docs/troubleshooting.md).
 * Expõe window.__instagramMinimal com o relatório da última varredura.
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await build({
  stdin: {
    contents: `
      import { DEFAULT_FILTERS } from '@im/core';
      import { BlockerEngine } from '@im/filters';
      window.__instagramMinimal?.stop();
      const engine = new BlockerEngine();
      engine.setFilters({ ...DEFAULT_FILTERS });
      engine.start();
      window.__instagramMinimal = engine;
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'iife',
  minify: true,
  outfile: resolve(root, 'dist/debug/inject.js'),
  tsconfig: resolve(root, 'tsconfig.json'),
  target: 'chrome116',
});
console.log('✓ dist/debug/inject.js');
