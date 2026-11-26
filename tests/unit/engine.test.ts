import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, NO_FILTERS, type Filters } from '@im/core';
import { ATTR, BlockerEngine, MESSAGES, buildStyles } from '@im/filters';
import * as M from '../fixtures/markup';

const q = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const hidden = (el: Element | null) => !!el?.closest(`[${ATTR.hidden}]`);
const placeholder = (el: Element | null) => el?.closest(`[${ATTR.placeholder}]`)?.getAttribute(ATTR.placeholder) ?? null;
const overlayShown = () => !!document.getElementById('instagram-minimal-ui')?.shadowRoot?.querySelector('.wrap');

let engine: BlockerEngine;

function go(path: string) {
  history.pushState({}, '', path);
}

function setup(path: string, html: string, filters: Filters = DEFAULT_FILTERS) {
  go(path);
  document.body.innerHTML = M.desktopNav() + html;
  engine = new BlockerEngine({ debounceMs: 10, routePollMs: 20 });
  engine.setFilters(filters);
  engine.start();
  return engine;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  engine?.stop();
  document.body.innerHTML = '';
  go('/');
});

describe('feed', () => {
  beforeEach(() => setup('/', M.feed(M.defaultFeedItems())));

  it('remove publicações sugeridas e anúncios', () => {
    expect(hidden(q('post-2'))).toBe(true); // sugerido
    expect(hidden(q('post-3'))).toBe(true); // anúncio
    expect(hidden(q('post-6'))).toBe(true); // Reel sugerido
    expect(hidden(q('post-8'))).toBe(true); // conta não seguida
    expect(engine.lastReport?.hidden).toMatchObject({ suggested: 3, sponsored: 1, discovery: 1 });
  });

  it('preserva posts de quem você segue (foto, vídeo comum, foto com música)', () => {
    for (const id of ['post-1', 'post-5', 'post-7']) {
      expect(hidden(q(id))).toBe(false);
      expect(placeholder(q(id))).toBe(null);
    }
  });

  it('troca Reels de contas seguidas por um aviso discreto', () => {
    expect(placeholder(q('post-4'))).toBe(MESSAGES.reelBlocked);
    expect(hidden(q('post-4'))).toBe(false);
  });

  it('preserva Stories e sugestões de PESSOAS', () => {
    expect(hidden(q('stories'))).toBe(false);
    expect(hidden(q('people-suggestions'))).toBe(false);
  });

  it('remove o bloco "Suggested reels"', () => {
    expect(hidden(q('suggested-reels-block'))).toBe(true);
  });

  it('aplica-se a posts carregados depois (rolagem infinita)', async () => {
    const list = q('feed-list');
    const div = document.createElement('div');
    div.innerHTML = M.post('20', 'suggested') + M.post('21', 'followed');
    list.appendChild(div);
    await wait(60);
    expect(hidden(q('post-20'))).toBe(true);
    expect(hidden(q('post-21'))).toBe(false);
  });

  it('reavalia um nó reaproveitado pelo React', async () => {
    const art = q('post-2');
    art.querySelector('[role="button"] div')!.textContent = '';
    art.querySelector('header span span')?.remove();
    art.appendChild(document.createElement('span')); // dispara o observer
    await wait(60);
    expect(hidden(art)).toBe(false);
  });

  it('respeita cada filtro individualmente', () => {
    engine.setFilters({ ...DEFAULT_FILTERS, blockSponsored: false });
    expect(hidden(q('post-3'))).toBe(false);
    expect(hidden(q('post-2'))).toBe(true);
    engine.setFilters({ ...DEFAULT_FILTERS, blockSuggestedPosts: false });
    expect(hidden(q('post-2'))).toBe(false);
    engine.setFilters({ ...DEFAULT_FILTERS, blockShortVideos: false });
    expect(placeholder(q('post-4'))).toBe(null);
  });

  it('desligado, não deixa nenhuma marca', () => {
    engine.setFilters(NO_FILTERS);
    expect(document.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}],[${ATTR.link}]`)).toHaveLength(0);
  });

  it('não entra em laço: sem mudanças na página, não varre de novo', async () => {
    const spy = vi.spyOn(engine, 'scan');
    await wait(150);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('nunca remove nós da página (só usa atributos)', () => {
    expect(q('post-2')).toBeTruthy();
    expect(q('post-3')).toBeTruthy();
  });
});

describe('Reels: navegação e rotas', () => {
  it('esconde a aba Reels via CSS e o Explorar (mas não a busca)', () => {
    const css = buildStyles(DEFAULT_FILTERS);
    expect(css).toContain('a[href="/reels/"]');
    expect(css).toContain('a[href="/explore/"]:not(:has(svg[aria-label="Search"]))');
    expect(buildStyles(NO_FILTERS)).not.toContain('a[href="/reels/"]');
  });

  it('cobre a página quando a URL vira /reels/ (navegação SPA)', async () => {
    setup('/', M.feed([M.post('1', 'followed')]));
    expect(overlayShown()).toBe(false);
    go('/reels/');
    document.body.insertAdjacentHTML('beforeend', M.reelsPage());
    await wait(60);
    expect(overlayShown()).toBe(true);
    const shadow = document.getElementById('instagram-minimal-ui')!.shadowRoot!;
    expect(shadow.querySelector('h1')!.textContent).toBe(MESSAGES.blocked);
  });

  it('cobre a página de um Reel aberto direto e libera ao voltar ao feed', async () => {
    setup('/reel/ABC/', M.reelsPage());
    expect(overlayShown()).toBe(true);
    go('/');
    await wait(60);
    expect(overlayShown()).toBe(false);
  });

  it('pausa vídeos enquanto a tela de bloqueio está aberta', async () => {
    setup('/reel/ABC/', M.reelsPage());
    const v = q('reels-video') as HTMLVideoElement;
    const pause = vi.spyOn(v, 'pause').mockImplementation(() => {});
    Object.defineProperty(v, 'paused', { value: false, configurable: true });
    v.dispatchEvent(new Event('play'));
    expect(pause).toHaveBeenCalled();
    expect(v.muted).toBe(true);
  });

  it('bloqueia cliques em links de Reels e mostra o aviso', () => {
    setup('/', M.feed([M.post('1', 'followed')]) + '<a href="/reel/XYZ/" data-testid="reel-link">ver</a>');
    const appHandler = vi.fn();
    document.body.addEventListener('click', appHandler);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    q('reel-link').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(appHandler).not.toHaveBeenCalled();
    expect(document.getElementById('instagram-minimal-ui')!.shadowRoot!.querySelector('.toast')!.textContent).toBe(
      MESSAGES.blocked,
    );
  });

  it('não interfere em cliques comuns', () => {
    setup('/', M.feed([M.post('1', 'followed')]));
    const appHandler = vi.fn();
    document.body.addEventListener('click', appHandler);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    q('nav-direct').dispatchEvent(ev);
    expect(appHandler).toHaveBeenCalled();
  });
});

describe('Direct', () => {
  beforeEach(() => setup('/direct/t/1/', M.directThread()));

  it('troca o cartão do Reel por "Reel bloqueado."', () => {
    expect(placeholder(q('direct-reel-DR1'))).toBe(MESSAGES.reelBlocked);
  });

  it('o cartão bloqueado não abre (clique e teclado)', () => {
    const open = vi.fn();
    q('direct-reel-DR1').addEventListener('click', open);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    q('direct-reel-DR1').querySelector('img')!.dispatchEvent(click);
    const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    q('direct-reel-DR1').dispatchEvent(key);
    expect(open).not.toHaveBeenCalled();
    expect(click.defaultPrevented && key.defaultPrevented).toBe(true);
  });

  it('marca o link de Reel colado como texto', () => {
    expect(q('direct-reel-link').getAttribute(ATTR.link)).toBe('blocked');
  });

  it('preserva vídeos comuns, posts compartilhados, textos e a caixa de mensagem', () => {
    expect(placeholder(q('direct-video-DV1'))).toBe(null);
    expect(placeholder(q('direct-post-DP1'))).toBe(null);
    expect(hidden(q('thread'))).toBe(false);
    expect(document.querySelector('textarea')!.closest(`[${ATTR.placeholder}],[${ATTR.hidden}]`)).toBe(null);
  });

  it('se um Reel abrir mesmo assim (diálogo em /p/), a tela de bloqueio cobre', async () => {
    go('/p/DR1/');
    document.body.insertAdjacentHTML('beforeend', M.postDialog(true));
    await wait(60);
    expect(overlayShown()).toBe(true);
  });

  it('post comum compartilhado abre normalmente', async () => {
    go('/p/DP1/');
    document.body.insertAdjacentHTML('beforeend', M.postDialog(false, 'DP1'));
    await wait(60);
    expect(overlayShown()).toBe(false);
  });

  it('com o filtro do Direct desligado, nada muda no Direct', () => {
    engine.setFilters({ ...DEFAULT_FILTERS, blockDirectReels: false, blockReelLinks: false });
    expect(placeholder(q('direct-reel-DR1'))).toBe(null);
  });
});

describe('Explorar', () => {
  it('oculto: esconde a grade, mantém a busca e avisa', () => {
    setup('/explore/', M.exploreGrid());
    for (let i = 1; i <= 6; i++) expect(hidden(q(`tile-${i}`))).toBe(true);
    expect(hidden(document.querySelector('input'))).toBe(false);
    const toast = document.getElementById('instagram-minimal-ui')!.shadowRoot!.querySelector('.toast.soft');
    expect(toast?.textContent).toBe(MESSAGES.exploreHidden);
  });

  it('acessível: mostra fotos e troca Reels por aviso', () => {
    setup('/explore/', M.exploreGrid(), { ...DEFAULT_FILTERS, hideExplore: false });
    for (let i = 1; i <= 6; i++) {
      const tile = q(`tile-${i}`);
      expect(hidden(tile)).toBe(false);
      expect(placeholder(tile) !== null).toBe(tile.dataset.reel === 'true');
    }
  });

  it('descoberta de pessoas (/explore/people/) fica liberada', () => {
    setup('/explore/people/', M.feed([M.peopleSuggestions()]));
    expect(hidden(q('people-suggestions'))).toBe(false);
    expect(overlayShown()).toBe(false);
  });
});

describe('janela flutuante de conversa (fora do Direct)', () => {
  it('bloqueia o Reel na janela flutuante sobre o Explorar e preserva o vídeo comum', () => {
    setup('/explore/', M.exploreGrid() + M.floatingChat(), { ...DEFAULT_FILTERS, hideExplore: false });
    expect(placeholder(q('direct-reel-FC1'))).toBe(MESSAGES.reelBlocked);
    expect(placeholder(q('direct-video-FV1'))).toBe(null);
    // Os blocos da grade continuam com o aviso de vídeo curto, não o do Direct.
    expect(placeholder(q('tile-2'))).toBe(MESSAGES.shortVideoBlocked);
  });

  it('também no feed', () => {
    setup('/', M.feed([M.post('1', 'followed')]) + M.floatingChat());
    expect(placeholder(q('direct-reel-FC1'))).toBe(MESSAGES.reelBlocked);
    expect(hidden(q('post-1'))).toBe(false);
  });
});

describe('"Voltar" da tela de bloqueio', () => {
  it('com diálogo aberto, fecha o diálogo (Esc) em vez de voltar no histórico', async () => {
    setup('/direct/t/1/', M.directThread(), { ...DEFAULT_FILTERS, blockDirectReels: false });
    go('/p/DR1/');
    document.body.insertAdjacentHTML('beforeend', M.postDialog(true));
    await wait(60);
    expect(overlayShown()).toBe(true);
    const esc = vi.fn((e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.querySelector('[role="dialog"]')?.remove();
        history.replaceState({}, '', '/direct/t/1/');
      }
    });
    document.addEventListener('keydown', esc);
    const back = vi.spyOn(history, 'back');
    (document.getElementById('instagram-minimal-ui')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
    await wait(450);
    expect(esc).toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(location.pathname).toBe('/direct/t/1/');
    expect(overlayShown()).toBe(false);
    document.removeEventListener('keydown', esc);
  });

  it('se o Esc não fechar, usa o botão "Close" do diálogo', async () => {
    setup('/direct/t/1/', M.directThread(), { ...DEFAULT_FILTERS, blockDirectReels: false });
    go('/p/DR1/');
    document.body.insertAdjacentHTML(
      'beforeend',
      M.postDialog(true).replace('<article>', '<div role="button" data-testid="close"><svg aria-label="Close" role="img"></svg></div><article>'),
    );
    await wait(60);
    const closed = vi.fn();
    q('close').addEventListener('click', closed);
    (document.getElementById('instagram-minimal-ui')!.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
    await wait(450);
    expect(closed).toHaveBeenCalled();
  });
});

describe('perfis e Stories', () => {
  it('perfil: fotos ficam, Reels da grade viram aviso', () => {
    setup('/amiga_1/', M.profilePage());
    expect(placeholder(q('ptile-1'))).toBe(null);
    expect(placeholder(q('ptile-2'))).toBe(MESSAGES.shortVideoBlocked);
    expect(placeholder(q('ptile-3'))).toBe(null);
  });

  it('Stories não são tocados', () => {
    setup('/stories/amiga_1/123/', M.storyViewer());
    expect(document.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}]`)).toHaveLength(0);
    expect(overlayShown()).toBe(false);
  });
});

describe('navegação entre seções', () => {
  it('feed → Direct → Reel → feed mantém o comportamento certo em cada tela', async () => {
    setup('/', M.feed(M.defaultFeedItems()));
    expect(hidden(q('post-2'))).toBe(true);

    go('/direct/t/1/');
    document.body.innerHTML = M.desktopNav() + M.directThread();
    await wait(60);
    expect(placeholder(q('direct-reel-DR1'))).toBe(MESSAGES.reelBlocked);
    expect(overlayShown()).toBe(false);

    go('/reels/ABC/');
    await wait(60);
    expect(overlayShown()).toBe(true);

    go('/');
    document.body.innerHTML = M.desktopNav() + M.feed(M.defaultFeedItems());
    await wait(60);
    expect(overlayShown()).toBe(false);
    expect(hidden(q('post-2'))).toBe(true);
    expect(hidden(q('post-1'))).toBe(false);
  });

  it('parar o engine limpa tudo', () => {
    setup('/reel/ABC/', M.reelsPage());
    engine.stop();
    expect(document.getElementById('instagram-minimal-ui')).toBe(null);
    expect(document.getElementById('instagram-minimal-style')).toBe(null);
  });
});
