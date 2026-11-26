/**
 * Userscript (iPhone com o app Userscripts, Android com Violentmonkey):
 * injeta dist/userscript/instagram-minimal.user.js no início da página, como
 * os gerenciadores fazem com @run-at document-start, numa tela de celular.
 */
import { test, expect, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIM_HTML, probe } from './fixtures';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const USERSCRIPT = resolve(root, 'dist/userscript/instagram-minimal.user.js');

test.use({ ...devices['iPhone 15'], browserName: 'chromium' });

test.beforeEach(async ({ context }) => {
  if (!existsSync(USERSCRIPT)) throw new Error('Rode "npm run build:userscript" antes.');
  await context.route(/^https?:\/\/(?!(www\.)?instagram\.com\/)/, (r) => r.abort());
  await context.route(/^https:\/\/(www\.)?instagram\.com\//, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SIM_HTML }),
  );
  await context.addInitScript({ content: readFileSync(USERSCRIPT, 'utf8') });
});

test('userscript no celular: feed limpo, Direct protegido, Reels bloqueados', async ({ page }) => {
  await page.goto('https://www.instagram.com/');
  await page.waitForSelector('[data-testid="post-1"]');
  await page.waitForTimeout(300);
  expect(await probe.hidden(page, 'post-2')).toBe(true); // sugerido
  expect(await probe.hidden(page, 'post-3')).toBe(true); // anúncio
  expect(await probe.placeholder(page, 'post-4')).toBe('Reel bloqueado.');
  expect(await probe.visible(page, 'post-1')).toBe(true);
  expect(await probe.visible(page, 'stories')).toBe(true);
  expect(await probe.visible(page, 'mobile-reels')).toBe(false);
  expect(await probe.visible(page, 'mobile-search')).toBe(true); // busca do celular fica

  await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/direct/t/1/'));
  await page.waitForTimeout(300);
  expect(await probe.placeholder(page, 'direct-reel-DR1')).toBe('Reel bloqueado.');
  await page.locator('[data-testid="direct-reel-DR1"]').tap({ force: true });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => location.pathname)).toBe('/direct/t/1/');
  expect(await probe.placeholder(page, 'direct-video-DV1')).toBe(null);

  await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/reels/'));
  await expect.poll(() => probe.overlay(page)).toBe(true);
});

test('userscript: link de Reel aberto direto mostra a tela de bloqueio', async ({ page }) => {
  await page.goto('https://www.instagram.com/reel/ABC/');
  await expect.poll(() => probe.overlay(page)).toBe(true);
  expect(await probe.overlayText(page)).toBe('Este conteúdo foi bloqueado pelo Instagram Minimal.');
});

test('userscript: cabeçalho válido para os gerenciadores', async () => {
  const head = readFileSync(USERSCRIPT, 'utf8').split('// ==/UserScript==')[0]!;
  expect(head).toContain('// ==UserScript==');
  expect(head).toContain('// @match        https://www.instagram.com/*');
  expect(head).toContain('// @run-at       document-start');
  expect(head).toContain('// @grant        none');
  expect(head).toMatch(/@downloadURL\s+https:\/\/bragahauser-byte\.github\.io\/instagram-minimal\/instagram-minimal\.user\.js/);
});
