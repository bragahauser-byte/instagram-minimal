/**
 * Gera o userscript (instagram-minimal.user.js) em:
 *   dist/userscript/                         (para a Release)
 *   apps/dashboard/public/                   (servido pelo site no GitHub Pages)
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const SITE = 'https://bragahauser-byte.github.io/instagram-minimal';

const header = `// ==UserScript==
// @name         Instagram Minimal
// @namespace    ${SITE}/
// @version      ${version}
// @description  Instagram sem Reels, sem vídeos curtos e sem publicações sugeridas. Direct, Stories e quem você segue continuam iguais.
// @author       Instagram Minimal contributors
// @homepageURL  ${SITE}/
// @supportURL   https://github.com/bragahauser-byte/instagram-minimal/issues
// @updateURL    ${SITE}/instagram-minimal.user.js
// @downloadURL  ${SITE}/instagram-minimal.user.js
// @icon         ${SITE}/apple-touch-icon.png
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @match        https://bragahauser-byte.github.io/instagram-minimal/*
// @run-at       document-start
// @noframes
// @grant        none
// @license      MIT
// ==/UserScript==
`;

const out = await build({
  entryPoints: [resolve(root, 'extensions/userscript/main.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: ['safari15', 'firefox115', 'chrome116'],
  minifySyntax: true,
  legalComments: 'none',
  tsconfig: resolve(root, 'tsconfig.json'),
  define: { __VERSION__: JSON.stringify(version) },
});
const code = header + '\n' + out.outputFiles[0].text;

for (const dir of ['dist/userscript', 'apps/dashboard/public']) {
  mkdirSync(resolve(root, dir), { recursive: true });
  writeFileSync(resolve(root, dir, 'instagram-minimal.user.js'), code);
}
console.log(`✓ instagram-minimal.user.js v${version} (${(code.length / 1024).toFixed(0)} KB)`);
