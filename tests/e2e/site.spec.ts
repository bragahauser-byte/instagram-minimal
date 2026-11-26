/**
 * Site do projeto (dist/dashboard) servido localmente no endereço do GitHub
 * Pages: guia por aparelho e detecção de "instalado".
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SITE_DIR = resolve(root, 'dist/dashboard');
const URL_SITE = 'https://bragahauser-byte.github.io/instagram-minimal/';
const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

async function serve(context: BrowserContext) {
  if (!existsSync(join(SITE_DIR, 'index.html'))) throw new Error('Rode "npm run build:dashboard" antes.');
  await context.route(/^https?:\/\/(?!bragahauser-byte\.github\.io\/)/, (r) => r.abort());
  await context.route(/^https:\/\/bragahauser-byte\.github\.io\/instagram-minimal\//, (r) => {
    let p = new URL(r.request().url()).pathname.replace(/^\/instagram-minimal/, '') || '/';
    if (p.endsWith('/')) p += 'index.html';
    const f = join(SITE_DIR, p);
    if (!existsSync(f)) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ contentType: MIME[extname(f)] ?? 'application/octet-stream', body: readFileSync(f) });
  });
}

test('iPhone no Safari: abre direto no guia do iPhone, 4 passos, sem aviso', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: UA.iphoneSafari, viewport: { width: 390, height: 844 } });
  await serve(context);
  const page = await context.newPage();
  await page.goto(URL_SITE);
  await expect(page.getByRole('tab', { name: 'iPhone' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.guide > li')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Baixar na App Store' })).toHaveAttribute('href', /apps\.apple\.com.*userscripts/);
  await expect(page.getByRole('link', { name: 'Instalar o Instagram Minimal' })).toHaveAttribute('href', /instagram-minimal\.user\.js$/);
  await expect(page.locator('.warn')).toHaveCount(0);
  await context.close();
});

test('iPhone no Chrome e Android no Chrome: avisam para trocar de navegador', async ({ browser }) => {
  for (const [ua, name] of [
    [UA.iphoneChrome, 'Safari'],
    [UA.androidChrome, 'Firefox'],
  ]) {
    const context = await browser.newContext({ userAgent: ua, viewport: { width: 390, height: 844 } });
    await serve(context);
    const page = await context.newPage();
    await page.goto(URL_SITE);
    await expect(page.locator('.warn')).toContainText(`Abra este site no ${name}`);
    await context.close();
  }
});

test('Android no Firefox: guia do Android com Violentmonkey', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: UA.androidFirefox, viewport: { width: 390, height: 844 } });
  await serve(context);
  const page = await context.newPage();
  await page.goto(URL_SITE);
  await expect(page.getByRole('tab', { name: 'Android' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: 'Abrir o Violentmonkey' })).toBeVisible();
  await expect(page.locator('.warn')).toHaveCount(0);
  await context.close();
});

test('computador: Chrome detectado; dá para ver o guia de outro aparelho pelas abas', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: UA.desktopChrome });
  await serve(context);
  const page = await context.newPage();
  await page.goto(URL_SITE);
  await expect(page.getByRole('tab', { name: 'Computador' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Chrome' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: 'Abrir na Chrome Web Store' })).toBeVisible();
  await page.getByRole('tab', { name: 'Firefox' }).click();
  await expect(page.locator('.guide > li')).toHaveCount(3);
  await page.getByRole('tab', { name: 'iPhone' }).click();
  await expect(page.getByRole('link', { name: 'Baixar na App Store' })).toBeVisible();
  // Marcar um passo como feito.
  await page.getByRole('button', { name: 'Feito', exact: true }).click();
  await expect(page.locator('.guide > li.done')).toHaveCount(1);
  await context.close();
});

test('com o script instalado, o site mostra "Instalado" e o botão do Instagram', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: UA.iphoneSafari, viewport: { width: 390, height: 844 } });
  await serve(context);
  await context.addInitScript({ content: readFileSync(resolve(root, 'dist/userscript/instagram-minimal.user.js'), 'utf8') });
  const page = await context.newPage();
  await page.goto(URL_SITE);
  await expect(page.getByRole('heading', { name: 'Instalado neste navegador.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir o Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/');
  // No site, o script não liga o bloqueio.
  expect(await page.evaluate(() => !!document.getElementById('instagram-minimal-style'))).toBe(false);
  await context.close();
});
