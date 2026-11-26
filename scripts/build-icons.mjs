/**
 * Gera os PNGs de ícone a partir de assets/logo.svg usando o Chromium do
 * Playwright (já é dependência de testes). Rodar só quando o logo mudar:
 *   npm run icons
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(resolve(root, 'assets/logo.svg'), 'utf8');

const targets = [
  ...[16, 32, 48, 128].map((s) => [s, `extensions/common/icons/icon-${s}.png`, true]),
  [180, 'apps/dashboard/public/apple-touch-icon.png', true],
  [32, 'apps/dashboard/public/favicon-32.png', true],
  [1024, 'apps/ios/Shared/Assets.xcassets/AppIcon.appiconset/icon-1024.png', false],
  [512, 'apps/ios/Shared/Assets.xcassets/LargeIcon.imageset/icon-512.png', true],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [size, out, rounded] of targets) {
  // Ícones da App Store não podem ter transparência nem cantos: fundo cheio.
  const body = rounded ? svg : svg.replace('rx="14.5"', 'rx="0"');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${body.replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`)}</body></html>`,
  );
  mkdirSync(resolve(root, dirname(out)), { recursive: true });
  await page.screenshot({ path: resolve(root, out), omitBackground: rounded, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('ícone', size, out);
}
await browser.close();
