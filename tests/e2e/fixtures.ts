/**
 * Abre um Chromium de verdade com dist/chromium carregada como extensão e
 * responde a https://www.instagram.com/* com o Instagram simulado
 * (nenhuma requisição sai para a internet).
 */
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const EXT = resolve(root, 'dist/chromium');

const simJs = buildSync({
  entryPoints: [resolve(root, 'tests/fixtures/sim.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'chrome116',
}).outputFiles[0]!.text;

export const SIM_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>sim</title></head>
<body><div id="app"></div><script>${simJs}</script></body></html>`;

type Fixtures = {
  context: BrowserContext;
  extensionId: string;
  ig: (path?: string) => Promise<Page>;
  popup: () => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!existsSync(resolve(EXT, 'manifest.json'))) throw new Error('Rode "npm run build:ext" antes.');
    const dir = mkdtempSync(join(tmpdir(), 'im-e2e-'));
    const context = await chromium.launchPersistentContext(dir, {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    });
    // Bloqueia qualquer outra saída de rede por garantia.
    await context.route(/^https?:\/\/(?!(www\.)?instagram\.com\/)/, (r) => r.abort());
    await context.route(/^https:\/\/(www\.)?instagram\.com\//, (r) =>
      r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: SIM_HTML }),
    );
    await use(context);
    await context.close();
    rmSync(dir, { recursive: true, force: true });
  },
  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    await use(new URL(sw.url()).host);
  },
  ig: async ({ context, extensionId }, use) => {
    void extensionId; // garante a extensão carregada antes
    await use(async (path = '/') => {
      const page = await context.newPage();
      await page.goto(`https://www.instagram.com${path}`);
      await page.waitForSelector('#app > *');
      await page.waitForTimeout(250);
      return page;
    });
  },
  popup: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      return page;
    });
  },
});

export const expect = test.expect;

/** Helpers que leem o estado da página simulada. */
export const probe = {
  hidden: (page: Page, id: string) =>
    page.locator(`[data-testid="${id}"]`).evaluate((el) => !!el.closest('[data-im-hidden]')),
  placeholder: (page: Page, id: string) =>
    page.locator(`[data-testid="${id}"]`).evaluate((el) => el.closest('[data-im-placeholder]')?.getAttribute('data-im-placeholder') ?? null),
  visible: (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).isVisible(),
  overlay: (page: Page) =>
    page.evaluate(() => !!document.getElementById('instagram-minimal-ui')?.shadowRoot?.querySelector('.wrap')),
  overlayText: (page: Page) =>
    page.evaluate(() => document.getElementById('instagram-minimal-ui')?.shadowRoot?.querySelector('h1')?.textContent ?? null),
};
