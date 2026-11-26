import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyFeedArticle,
  findDirectReelCards,
  findGridTiles,
  findSuggestedContentBlocks,
  isSearchEntry,
  primaryPostShowsReel,
} from '@im/filters';
import * as M from '../fixtures/markup';

const $ = (sel: string) => document.querySelector(sel)!;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('classificação de posts do feed', () => {
  const expected: [M.PostKind, string][] = [
    ['followed', 'post'],
    ['followed-video', 'post'],
    ['followed-music', 'post'],
    ['followed-reel', 'reel'],
    ['suggested', 'suggested'],
    ['suggested-reel', 'suggested'],
    ['follow-button-only', 'suggested'],
    ['sponsored', 'sponsored'],
  ];
  it.each(expected)('%s → %s', (kind, result) => {
    document.body.innerHTML = M.post('9', kind);
    expect(classifyFeedArticle($('article'))).toBe(result);
  });

  it('carrossel de pessoas sugeridas não é post', () => {
    document.body.innerHTML = `<article>${M.peopleSuggestions()}</article>`;
    expect(classifyFeedArticle($('article'))).toBe('not-a-post');
  });

  it('reconhece rótulos em português', () => {
    document.body.innerHTML = M.post('9', 'followed').replace('</header>', '<span>Sugestões para você</span></header>');
    expect(classifyFeedArticle($('article'))).toBe('suggested');
    document.body.innerHTML = M.post('9', 'followed').replace('</header>', '<span>Patrocinado</span></header>');
    expect(classifyFeedArticle($('article'))).toBe('sponsored');
  });

  it('não depende de classes CSS', () => {
    document.body.innerHTML = M.post('9', 'suggested').replace(/class="[^"]*"/g, '');
    expect(classifyFeedArticle($('article'))).toBe('suggested');
  });

  it('a palavra "Seguir" na legenda não transforma post em sugestão', () => {
    document.body.innerHTML = M.post('9', 'followed').replace('Legenda fictícia', 'Bora seguir a trilha');
    expect(classifyFeedArticle($('article'))).toBe('post');
  });
});

describe('blocos de descoberta no feed', () => {
  it('encontra "Suggested reels" e preserva pessoas sugeridas', () => {
    document.body.innerHTML = M.feed(M.defaultFeedItems());
    const blocks = findSuggestedContentBlocks($('main'));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.querySelector('[data-testid="suggested-reels-block"]') ?? blocks[0]).toBeTruthy();
    expect(blocks.some((b) => b.querySelector('[data-testid="people-suggestions"]'))).toBe(false);
    expect(blocks.some((b) => b.querySelector('article'))).toBe(false);
  });
});

describe('Direct', () => {
  beforeEach(() => {
    document.body.innerHTML = M.directThread();
  });

  it('encontra o cartão de Reel compartilhado', () => {
    const cards = findDirectReelCards(document);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toContain('direct-reel-DR1');
  });

  it('encontra o link de Reel colado como texto', () => {
    const cards = findDirectReelCards(document);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toContain('direct-reel-link');
  });

  it('não pega vídeo comum nem post compartilhado', () => {
    const ids = findDirectReelCards(document).map((c) => c.getAttribute('data-testid'));
    expect(ids).not.toContain('direct-video-DV1');
    expect(ids).not.toContain('direct-post-DP1');
    expect(ids).toHaveLength(2);
  });

  it('nunca marca a área de digitação', () => {
    const cards = findDirectReelCards(document);
    expect(cards.some((c) => c.querySelector('textarea'))).toBe(false);
  });
});

describe('grades e diálogos', () => {
  it('identifica blocos de Reel no Explorar pelo ícone', () => {
    document.body.innerHTML = M.exploreGrid();
    const tiles = findGridTiles(document);
    expect(tiles).toHaveLength(6);
    for (const t of tiles) expect(String(t.isReel)).toBe(t.el.getAttribute('data-reel'));
  });

  it('identifica Reels na grade do perfil pelo link /reel/', () => {
    document.body.innerHTML = M.profilePage();
    const reels = findGridTiles(document).filter((t) => t.isReel);
    expect(reels.map((t) => t.el.getAttribute('data-testid'))).toEqual(['ptile-2']);
  });

  it('diálogo de Reel aberto pelo Direct é reconhecido; post comum não', () => {
    document.body.innerHTML = M.postDialog(true);
    expect(primaryPostShowsReel($('[role=dialog]'))).toBe(true);
    document.body.innerHTML = M.postDialog(false);
    expect(primaryPostShowsReel($('[role=dialog]'))).toBe(false);
  });

  it('página de post comum com grade de Reels embaixo não é Reel', () => {
    document.body.innerHTML = `<main>${M.postDialog(false).replace('role="dialog"', '')}${M.exploreGrid()}</main>`;
    expect(primaryPostShowsReel($('main'))).toBe(false);
  });

  it('item /explore/ com ícone de busca é a busca (celular)', () => {
    document.body.innerHTML = M.mobileNav() + M.desktopNav();
    expect(isSearchEntry($('[data-testid="mobile-search"]'))).toBe(true);
    expect(isSearchEntry($('[data-testid="nav-explore"]'))).toBe(false);
  });
});
