/**
 * Gera as imagens de docs/images/ a partir do build real:
 *   - painel da extensão (popup) em telas diferentes, claro e escuro
 *   - página do projeto (GitHub Pages)
 *   - Instagram simulado com a extensão ativa
 * Requer: npm run build (extensão + painel).
 */
import { chromium } from '@playwright/test';
import { buildSync } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'docs/images');
mkdirSync(out, { recursive: true });
const EXT = resolve(root, 'dist/chromium');
const SITE = resolve(root, 'dist/dashboard');

const simJs = buildSync({ entryPoints: [resolve(root, 'tests/fixtures/sim.ts')], bundle: true, write: false, format: 'iife' })
  .outputFiles[0].text;
const SIM = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;background:#fff;color:#000}
main{max-width:470px;margin:0 auto;padding:16px}article{border-bottom:1px solid #dbdbdb;padding:12px 0}
article img,article video{width:100%;aspect-ratio:1;background:#efefef;display:block;margin:8px 0}
[data-testid=nav]{position:fixed;left:0;top:0;bottom:0;width:72px;border-right:1px solid #dbdbdb;display:flex;flex-direction:column;gap:18px;padding:24px 12px;font-size:11px}
[data-testid=nav] a{color:#000;text-decoration:none}[data-testid=mobile-nav]{display:none}
header{display:flex;gap:8px;align-items:center;font-size:14px}header img{width:32px;height:32px;border-radius:50%;margin:0!important}
[role=menu]{display:flex;gap:12px;padding:8px 0 16px}[role=menu] img{width:56px;height:56px;border-radius:50%;background:#efefef}
section{display:none}a{color:#00376b}[data-testid=people-suggestions]{background:#fafafa;padding:12px;border-radius:8px;margin:12px 0}
[data-testid=people-suggestions] img{width:40px;height:40px;border-radius:50%;background:#ddd}
[data-testid=thread]{display:flex;flex-direction:column;gap:10px}[role=article]{background:#efefef;border-radius:18px;padding:10px 14px;max-width:260px}
</style></head><body><div id="app"></div><script>${simJs}</script></body></html>`;

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

for (const p of [EXT, SITE]) if (!existsSync(p)) throw new Error(`Falta ${p}. Rode npm run build.`);

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'im-shots-')), {
  channel: 'chromium',
  headless: true,
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
await ctx.route(/^https:\/\/(www\.)?instagram\.com\//, (r) => r.fulfill({ contentType: 'text/html', body: SIM }));
await ctx.route(/^https:\/\/site\.test\//, (r) => {
  let path = new URL(r.request().url()).pathname.replace(/^\/instagram-minimal/, '') || '/';
  if (path.endsWith('/')) path += 'index.html';
  const file = join(SITE, path);
  if (!existsSync(file)) return r.fulfill({ status: 404, body: '' });
  return r.fulfill({ contentType: mime[extname(file)] ?? 'application/octet-stream', body: readFileSync(file) });
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = new URL(sw.url()).host;

async function popupShots(scheme) {
  const p = await ctx.newPage();
  await p.emulateMedia({ colorScheme: scheme });
  await p.setViewportSize({ width: 360, height: 600 });
  await sw.evaluate(() => chrome.storage.local.clear());
  await p.goto(`chrome-extension://${id}/popup.html`);
  await p.getByRole('button', { name: 'Configurar agora' }).waitFor();
  await p.waitForTimeout(400);
  await p.screenshot({ path: join(out, `popup-welcome-${scheme}.png`) });
  await p.getByRole('button', { name: 'Configurar agora' }).click();
  await p.waitForTimeout(250);
  await p.screenshot({ path: join(out, `popup-modes-${scheme}.png`) });
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(out, `popup-home-${scheme}.png`) });
  await p.getByRole('button', { name: /Configurações de bloqueio/ }).click();
  await p.waitForTimeout(250);
  await p.setViewportSize({ width: 360, height: 760 });
  await p.screenshot({ path: join(out, `popup-settings-${scheme}.png`) });
  await p.close();
}
await popupShots('light');
await popupShots('dark');

// Instagram simulado (feed e Direct) com a extensão ativa.
for (const [name, path] of [
  ['demo-feed', '/'],
  ['demo-direct', '/direct/t/1/'],
  ['demo-reel', '/reels/ABC/'],
]) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 900, height: 900 });
  await p.goto(`https://www.instagram.com${path}`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: join(out, `${name}.png`) });
  await p.close();
}

// Página do projeto.
for (const scheme of ['light', 'dark']) {
  const p = await ctx.newPage();
  await p.emulateMedia({ colorScheme: scheme });
  await p.setViewportSize({ width: 1280, height: 860 });
  await p.goto('https://site.test/instagram-minimal/');
  await p.waitForTimeout(500);
  await p.screenshot({ path: join(out, `site-hero-${scheme}.png`) });
  await p.locator('#previa').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(out, `site-preview-${scheme}.png`) });
  await p.close();
}
await ctx.close();
console.log('✓ docs/images');
