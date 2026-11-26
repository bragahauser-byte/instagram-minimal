/**
 * Gera as extensões em dist/<alvo>/ a partir do mesmo código:
 *   dist/chromium  → Chrome e Edge
 *   dist/firefox   → Firefox (desktop e Android)
 *   dist/safari    → recursos da Safari Web Extension (macOS e iOS)
 *
 * O código não é minificado de propósito: fica legível para revisão
 * (lojas e quem quiser auditar a extensão).
 *
 * Uso: node scripts/build-extensions.mjs [chromium|firefox|safari ...]
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const ALL = ['chromium', 'firefox', 'safari'];
const targets = process.argv.slice(2).filter((t) => ALL.includes(t));
const list = targets.length ? targets : ALL;

const src = (p) => resolve(root, 'extensions/common/src', p);

const BROWSER_TARGET = {
  chromium: ['chrome116', 'edge116'],
  firefox: ['firefox128'],
  safari: ['safari16'],
};

for (const target of list) {
  const out = resolve(root, 'dist', target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  await build({
    entryPoints: {
      content: src('content.ts'),
      background: src('background.ts'),
      popup: src('popup.tsx'),
      options: src('options.tsx'),
      blocked: src('blocked.ts'),
    },
    outdir: out,
    bundle: true,
    format: 'iife',
    target: BROWSER_TARGET[target],
    minify: false,
    // Remove ramos mortos (ex.: React de desenvolvimento) sem ofuscar nomes.
    minifySyntax: true,
    sourcemap: false,
    legalComments: 'none',
    jsx: 'automatic',
    tsconfig: resolve(root, 'tsconfig.json'),
    define: {
      'process.env.NODE_ENV': '"production"',
      __TARGET__: JSON.stringify(target),
      __VERSION__: JSON.stringify(pkg.version),
    },
    logLevel: 'warning',
  });

  cpSync(resolve(root, 'extensions/common/static'), out, { recursive: true });
  cpSync(resolve(root, 'extensions/common/icons'), resolve(out, 'icons'), { recursive: true });

  const manifest = JSON.parse(readFileSync(resolve(root, 'extensions', target, 'manifest.json'), 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✓ dist/${target} (v${pkg.version})`);
}
