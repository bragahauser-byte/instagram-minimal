import { expect, probe, test } from './fixtures';

test.describe('bloqueio na página (Chromium + extensão real)', () => {
  test('feed: some sugerido/anúncio/descoberta, Reel vira aviso, o resto fica', async ({ ig }) => {
    const page = await ig('/');
    expect(await probe.hidden(page, 'post-2')).toBe(true);
    expect(await probe.hidden(page, 'post-3')).toBe(true);
    expect(await probe.hidden(page, 'post-6')).toBe(true);
    expect(await probe.hidden(page, 'suggested-reels-block')).toBe(true);
    expect(await probe.visible(page, 'post-2')).toBe(false);

    expect(await probe.visible(page, 'post-1')).toBe(true);
    expect(await probe.visible(page, 'post-5')).toBe(true);
    expect(await probe.visible(page, 'post-7')).toBe(true);
    expect(await probe.visible(page, 'stories')).toBe(true);
    expect(await probe.visible(page, 'people-suggestions')).toBe(true);

    expect(await probe.placeholder(page, 'post-4')).toBe('Reel bloqueado.');
    // O aviso aparece de fato (pseudo-elemento) e o vídeo some.
    const after = await page.locator('[data-testid="post-4"]').evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after).toBe('"Reel bloqueado."');
    expect(await page.locator('[data-testid="video-4"]').isVisible()).toBe(false);
  });

  test('posts que chegam depois (rolagem infinita) também são filtrados', async ({ ig }) => {
    const page = await ig('/');
    await page.waitForSelector('[data-testid="post-31"]');
    await page.waitForTimeout(200);
    expect(await probe.hidden(page, 'post-30')).toBe(true);
    expect(await probe.visible(page, 'post-31')).toBe(true);
  });

  test('aba Reels e Explorar somem da navegação; a busca do celular fica', async ({ ig }) => {
    const page = await ig('/');
    expect(await probe.visible(page, 'nav-reels')).toBe(false);
    expect(await probe.visible(page, 'mobile-reels')).toBe(false);
    expect(await probe.visible(page, 'nav-explore')).toBe(false);
    expect(await probe.visible(page, 'mobile-search')).toBe(true);
    expect(await probe.visible(page, 'nav-direct')).toBe(true);
    expect(await probe.visible(page, 'nav-home')).toBe(true);
  });

  test('navegar para /reels/ dentro do site (SPA) mostra a tela de bloqueio', async ({ ig }) => {
    const page = await ig('/');
    await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/reels/'));
    await expect.poll(() => probe.overlay(page)).toBe(true);
    expect(await probe.overlayText(page)).toBe('Este conteúdo foi bloqueado pelo Instagram Minimal.');
    // "Voltar" leva de volta ao feed e a tela some.
    await page.evaluate(() =>
      (document.getElementById('instagram-minimal-ui')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click(),
    );
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe('/');
    await expect.poll(() => probe.overlay(page)).toBe(false);
  });

  test('clique em link de Reel não navega', async ({ ig }) => {
    const page = await ig('/');
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<a href="/reel/ABC/" data-testid="x">reel</a>');
    });
    await page.locator('[data-testid="x"]').click({ force: true });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => location.pathname)).toBe('/');
    expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual([]);
  });

  test('link de Reel aberto direto: a regra de rede redireciona antes de qualquer requisição', async ({ context, extensionId }) => {
    // A regra é instalada pelo background logo que a extensão inicia.
    const [sw] = context.serviceWorkers();
    await expect
      .poll(() => sw!.evaluate(() => chrome.declarativeNetRequest.getDynamicRules().then((r) => r.length)))
      .toBe(1);
    // Sem o Instagram simulado: qualquer requisição que escapasse seria registrada e abortada.
    await context.unrouteAll();
    const escaped: string[] = [];
    await context.route(/^https?:\/\//, (r) => {
      escaped.push(r.request().url());
      return r.abort();
    });
    const page = await context.newPage();
    await page.goto('https://www.instagram.com/reel/ABC123/?igsh=teste').catch(() => undefined);
    await expect.poll(() => page.url()).toBe(`chrome-extension://${extensionId}/blocked.html`);
    await expect(page.locator('#title')).toHaveText('Este conteúdo foi bloqueado pelo Instagram Minimal.');
    expect(escaped.filter((u) => u.includes('instagram.com'))).toEqual([]);
  });

  test('link de Reel aberto direto: se a página carregar mesmo assim, o content script cobre', async ({ ig }) => {
    // Aqui o Playwright entrega a página antes da regra de rede, simulando uma falha dela.
    const page = await ig('/reel/ABC123/');
    expect(await probe.overlay(page)).toBe(true);
  });

  test('Direct: Reel vira "Reel bloqueado." e não abre; vídeo comum e post ficam', async ({ ig }) => {
    const page = await ig('/direct/t/1/');
    expect(await probe.placeholder(page, 'direct-reel-DR1')).toBe('Reel bloqueado.');
    await page.locator('[data-testid="direct-reel-DR1"]').click({ force: true });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => location.pathname)).toBe('/direct/t/1/');
    expect(await page.locator('[role="dialog"]').count()).toBe(0);

    expect(await probe.placeholder(page, 'direct-video-DV1')).toBe(null);
    expect(await probe.visible(page, 'direct-video-el-DV1')).toBe(true);

    // Post (foto) compartilhado abre normalmente.
    await page.locator('[data-testid="direct-post-DP1"]').click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    expect(await probe.overlay(page)).toBe(false);

    await expect(page.locator('textarea')).toBeVisible();
  });

  test('Direct: se um Reel abrir por outro caminho, a tela de bloqueio cobre', async ({ ig }) => {
    const page = await ig('/direct/t/1/');
    // Simula um cartão que os detectores não reconheceram.
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="direct-reel-DR1"]')!;
      card.removeAttribute('data-im-placeholder');
      history.pushState({}, '', '/p/DR1/');
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div role="dialog"><article><a href="/autor/reel/DR1/">1d</a><a href="/reels/audio/1/">audio</a><video muted></video></article></div>',
      );
    });
    await expect.poll(() => probe.overlay(page)).toBe(true);
  });

  test('Explorar oculto esconde a grade; perfil troca só Reels; Stories intactos', async ({ ig }) => {
    const page = await ig('/explore/');
    expect(await probe.hidden(page, 'tile-1')).toBe(true);
    expect(await page.locator('input').isVisible()).toBe(true);

    await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/amiga_1/'));
    await page.waitForTimeout(200);
    expect(await probe.placeholder(page, 'ptile-2')).toBe('Vídeo curto bloqueado.');
    expect(await probe.placeholder(page, 'ptile-1')).toBe(null);
    expect(await probe.visible(page, 'profile-reels-tab')).toBe(false);

    await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/stories/amiga_1/1/'));
    await page.waitForTimeout(200);
    expect(await probe.visible(page, 'story-video')).toBe(true);
    expect(await probe.overlay(page)).toBe(false);
  });

  test('funciona após atualizar a página', async ({ ig }) => {
    const page = await ig('/');
    await page.reload();
    await page.waitForSelector('#app > *');
    await page.waitForTimeout(250);
    expect(await probe.hidden(page, 'post-2')).toBe(true);
    expect(await probe.placeholder(page, 'post-4')).toBe('Reel bloqueado.');
  });

  test('navegação entre seções: feed → Direct → perfil → feed', async ({ ig }) => {
    const page = await ig('/');
    await page.locator('[data-testid="nav-direct"]').click();
    await page.waitForTimeout(200);
    expect(await probe.placeholder(page, 'direct-reel-DR1')).toBe('Reel bloqueado.');
    await page.evaluate(() => (window as unknown as { __nav: (p: string) => void }).__nav('/amiga_1/'));
    await page.waitForTimeout(200);
    expect(await probe.placeholder(page, 'ptile-2')).toBe('Vídeo curto bloqueado.');
    await page.locator('[data-testid="nav-home"]').click();
    await page.waitForTimeout(200);
    expect(await probe.hidden(page, 'post-2')).toBe(true);
    expect(await probe.visible(page, 'post-1')).toBe(true);
  });
});

test.describe('painel e modos', () => {
  test('configuração inicial e modo Manual (liga/desliga e persiste)', async ({ ig, popup }) => {
    const ui = await popup();
    await expect(ui.getByRole('heading', { name: 'Seu Instagram. Do seu jeito.' })).toBeVisible();
    await expect(ui.getByText('Menos distrações. Mais intenção.')).toBeVisible();
    await ui.getByRole('button', { name: 'Configurar agora' }).click();
    await ui.getByRole('radio', { name: /Manual/ }).click();
    await ui.getByRole('button', { name: 'Continuar' }).click();
    await expect(ui.getByText('Bloqueador ativo')).toBeVisible();

    const page = await ig('/');
    expect(await probe.hidden(page, 'post-2')).toBe(true);

    await ui.getByRole('switch', { name: 'Bloqueador' }).click();
    await expect(ui.getByText('Bloqueador desligado')).toBeVisible();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(false);
    expect(await probe.visible(page, 'nav-reels')).toBe(true);

    // Persistência: recarregar a página e reabrir o painel.
    await page.reload();
    await page.waitForSelector('#app > *');
    await page.waitForTimeout(250);
    expect(await probe.hidden(page, 'post-2')).toBe(false);
    const ui2 = await popup();
    await expect(ui2.getByText('Bloqueador desligado')).toBeVisible();

    await ui2.getByRole('switch', { name: 'Bloqueador' }).click();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(true);
  });

  test('configurações individuais refletem na página na hora', async ({ ig, popup }) => {
    const ui = await popup();
    await ui.getByRole('button', { name: 'Configurar agora' }).click();
    await ui.getByRole('button', { name: 'Continuar' }).click(); // Automático (padrão)
    const page = await ig('/');
    await ui.getByRole('button', { name: /Configurações de bloqueio/ }).click();
    await ui.getByRole('switch', { name: 'Publicações sugeridas' }).click();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(false);
    expect(await probe.hidden(page, 'post-3')).toBe(true); // anúncio continua
    await ui.getByRole('switch', { name: 'Vídeos curtos' }).click();
    await expect.poll(() => probe.placeholder(page, 'post-4')).toBe(null);
    await ui.getByRole('button', { name: 'Restaurar padrões' }).click();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(true);
  });

  test('modo Automático: pausa temporária e retomada', async ({ ig, popup }) => {
    const ui = await popup();
    await ui.getByRole('button', { name: 'Configurar agora' }).click();
    await ui.getByRole('radio', { name: /Automático/ }).click();
    await ui.getByRole('button', { name: 'Continuar' }).click();
    const page = await ig('/');
    expect(await probe.hidden(page, 'post-2')).toBe(true);

    await ui.getByRole('button', { name: 'Pausar' }).click();
    await ui.getByRole('button', { name: '5 minutos', exact: true }).click();
    await expect(ui.getByText('Bloqueador pausado')).toBeVisible();
    await expect(ui.getByText(/Volta sozinho às/)).toBeVisible();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(false);

    await ui.getByRole('button', { name: 'Retomar agora' }).click();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(true);
  });

  test('modo Foco: pausar exige espera + frase; sem isso nada muda', async ({ ig, context, extensionId }) => {
    const ui = await context.newPage();
    await ui.clock.install({ time: Date.now() });
    await ui.goto(`chrome-extension://${extensionId}/popup.html`);
    await ui.getByRole('button', { name: 'Configurar agora' }).click();
    await ui.getByRole('radio', { name: /Foco permanente/ }).click();
    await ui.getByRole('button', { name: 'Continuar' }).click();
    const page = await ig('/');

    await ui.getByRole('button', { name: /Configurações de bloqueio/ }).click();
    await ui.getByRole('switch', { name: 'Publicações sugeridas' }).click();
    await expect(ui.getByRole('heading', { name: 'Tem certeza?' })).toBeVisible();
    await ui.getByRole('button', { name: 'Cancelar' }).click();
    expect(await probe.hidden(page, 'post-2')).toBe(true);
    await ui.getByRole('button', { name: 'Voltar' }).click();

    await ui.getByRole('button', { name: /Pausar 10 min/ }).click();
    await ui.getByRole('button', { name: 'Começar a espera' }).click();
    await expect(ui.getByText('Respire um pouco')).toBeVisible();
    await ui.clock.fastForward('00:30');
    await expect(ui.getByText('Respire um pouco')).toBeVisible(); // ainda esperando
    await ui.clock.fastForward('00:31');
    await expect(ui.getByRole('heading', { name: 'Confirme' })).toBeVisible();

    await ui.getByLabel('Frase de confirmação').fill('não sei');
    await ui.getByRole('button', { name: 'Desbloquear por 5 minutos' }).click();
    await expect(ui.getByText('A frase não confere.')).toBeVisible();
    expect(await probe.hidden(page, 'post-2')).toBe(true);

    await ui.getByLabel('Frase de confirmação').fill('quero desativar agora');
    await ui.getByRole('button', { name: 'Desbloquear por 5 minutos' }).click();
    await expect(ui.getByText('Bloqueador pausado')).toBeVisible();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(false);

    await ui.getByRole('button', { name: 'Retomar agora' }).click();
    await expect.poll(() => probe.hidden(page, 'post-2')).toBe(true);
  });

  test('tela de privacidade lista as garantias e permissões', async ({ popup }) => {
    const ui = await popup();
    await ui.getByRole('button', { name: 'Configurar agora' }).click();
    await ui.getByRole('button', { name: 'Continuar' }).click();
    await ui.getByRole('button', { name: 'Privacidade' }).click();
    for (const t of [
      'Nenhuma senha armazenada',
      'Nenhuma conta intermediada pelo Instagram Minimal',
      'Configurações armazenadas localmente',
      'Nenhum rastreamento publicitário',
      'declarativeNetRequest',
    ]) {
      await expect(ui.getByText(t, { exact: true })).toBeVisible();
    }
  });

  test('a instalação abre a configuração inicial', async ({ context, extensionId }) => {
    await expect
      .poll(() => context.pages().some((p) => p.url() === `chrome-extension://${extensionId}/options.html#welcome`))
      .toBe(true);
  });
});
