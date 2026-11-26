/**
 * Detectores: recebem um pedaço da página e dizem o que ele é.
 * Não alteram nada; quem altera é o engine. Isso permite testar cada
 * detector isoladamente com HTML fictício.
 */
import { SELECTORS, hasLeafLabel, hasReelIcon, hasSearchIcon, leafTexts, matchesLabel } from './selectors';
import { isPostOrReelHref, isReelAudioHref, isSpecificReelHref, instagramPath, classifyPath } from './urls';

const hrefs = (root: ParentNode) =>
  Array.from(root.querySelectorAll(SELECTORS.anchor), (a) => a.getAttribute('href'));

/**
 * Sinais de que um bloco contém um Reel.
 * - "strong": link para um Reel específico ou ícone de Reel/Clip.
 * - "audio": link para página de áudio de Reels (também aparece em fotos com
 *   música; só vale junto de um <video>).
 */
export function reelSignals(
  root: Element,
  opts: { ignoreTiles?: boolean } = {},
): { strong: boolean; audio: boolean; video: boolean } {
  // ignoreTiles: numa página de post, a grade "Mais publicações de…" embaixo
  // traz blocos de outros Reels; eles não dizem nada sobre o post principal.
  const isTile = (el: Element) => opts.ignoreTiles === true && el.closest('a[href]')?.querySelector('img, video') != null;
  const anchors = Array.from(root.querySelectorAll(SELECTORS.anchor)).filter((a) => !isTile(a));
  const hs = anchors.map((a) => a.getAttribute('href'));
  const icon = Array.from(root.querySelectorAll(SELECTORS.labeledSvg)).some(
    (s) => matchesLabel('reelIcon', s.getAttribute('aria-label')) && !isTile(s),
  );
  return {
    strong: hs.some((h) => isSpecificReelHref(h)) || icon,
    audio: hs.some((h) => isReelAudioHref(h)),
    video: root.querySelector(SELECTORS.video) !== null,
  };
}

export function containsReel(root: Element, opts: { ignoreTiles?: boolean } = {}): boolean {
  const s = reelSignals(root, opts);
  return s.strong || (s.audio && s.video);
}

/** É um post (e não, por exemplo, um carrossel de pessoas sugeridas)? */
export function isPostArticle(article: Element): boolean {
  if (hrefs(article).some((h) => isPostOrReelHref(h))) return true;
  // Posts ainda carregando podem não ter o link; um vídeo já basta.
  return article.querySelector(SELECTORS.video) !== null;
}

export type PostKind = 'sponsored' | 'suggested' | 'reel' | 'post' | 'not-a-post';

function hasFollowButton(article: Element): boolean {
  return Array.from(article.querySelectorAll(SELECTORS.button)).some((b) =>
    // Botões com texto curto e exato: "Follow"/"Seguir".
    matchesLabel('follow', b.textContent),
  );
}

export function classifyFeedArticle(article: Element): PostKind {
  const isAd = article.querySelector(SELECTORS.adLink) !== null || hasLeafLabel(article, 'sponsored');
  if (!isPostArticle(article) && !isAd) return 'not-a-post';
  if (isAd) return 'sponsored';
  if (hasLeafLabel(article, 'suggested') || hasFollowButton(article)) return 'suggested';
  if (containsReel(article)) return 'reel';
  return 'post';
}

/**
 * Cartões de Reels compartilhados em conversas. Vale para a página do
 * Direct e também para a janela flutuante de conversa que o Instagram abre
 * por cima de outras telas. Só considera elementos dentro de uma bolha de
 * mensagem ([role="article"] explícito; posts do feed usam a tag <article>,
 * que não casa com esse seletor).
 */
export function findDirectReelCards(root: ParentNode, opts: { textLinks?: boolean } = {}): Element[] {
  const out = new Set<Element>();
  for (const svg of Array.from(root.querySelectorAll(SELECTORS.labeledSvg))) {
    if (!matchesLabel('reelIcon', svg.getAttribute('aria-label'))) continue;
    const card = svg.closest(SELECTORS.button) ?? svg.closest('a[href]');
    if (!card || !card.closest(SELECTORS.message)) continue;
    // Nunca marca a área de digitação nem um bloco com várias mensagens.
    if (card.querySelector(`textarea, [contenteditable="true"], ${SELECTORS.message}`)) continue;
    out.add(card);
  }
  for (const a of Array.from(root.querySelectorAll(SELECTORS.anchor))) {
    if (!isSpecificReelHref(a.getAttribute('href'))) continue;
    if (opts.textLinks || a.closest(SELECTORS.message)) out.add(a);
  }
  // Mantém só os mais externos (evita marcar o mesmo cartão duas vezes).
  return [...out].filter((el) => ![...out].some((other) => other !== el && other.contains(el)));
}

export interface GridTile {
  el: Element;
  isReel: boolean;
}

/** Blocos de grade (Explorar, perfil, hashtags). */
export function findGridTiles(root: ParentNode): GridTile[] {
  const tiles: GridTile[] = [];
  for (const a of Array.from(root.querySelectorAll(SELECTORS.anchor))) {
    const href = a.getAttribute('href');
    if (!isPostOrReelHref(href)) continue;
    if (!a.querySelector('img, video')) continue; // links de texto não são blocos
    tiles.push({ el: a, isReel: isSpecificReelHref(href) || hasReelIcon(a) });
  }
  return tiles;
}

/**
 * Sobe a partir de um elemento até o item da lista do feed (o irmão dos
 * outros posts). Se não achar uma lista confiável, devolve null.
 */
export function closestFeedItem(el: Element, stopAt?: Element | null): Element | null {
  let cur: Element | null = el;
  for (let depth = 0; cur && cur.parentElement && depth < 12; depth++) {
    const parent: Element = cur.parentElement;
    if (parent === stopAt || parent.tagName === 'BODY' || parent.tagName === 'MAIN') return cur;
    const siblings = Array.from(parent.children).filter((c) => c !== cur);
    if (siblings.some((s) => s.tagName === 'ARTICLE' || s.querySelector(':scope > article, :scope > div > article'))) {
      return cur;
    }
    cur = parent;
  }
  return null;
}

/** Blocos de descoberta ("Reels sugeridos", "Publicações sugeridas") no feed. */
export function findSuggestedContentBlocks(root: Element): Element[] {
  const out = new Set<Element>();
  const walker = root.ownerDocument.createTreeWalker(root, 1);
  let n: Node | null = walker.nextNode();
  while (n) {
    const el = n as Element;
    if (el.childElementCount === 0 && matchesLabel('suggestedContentHeadings', el.textContent)) {
      const item = closestFeedItem(el, root);
      // Só remove se o bloco realmente tem conteúdo (posts/reels), não pessoas.
      if (item && item.tagName !== 'ARTICLE' && hrefs(item).some((h) => isPostOrReelHref(h))) out.add(item);
    }
    n = walker.nextNode();
  }
  return [...out];
}

/** O item /explore/ é a busca (celular)? Nesse caso nunca escondemos. */
export function isSearchEntry(link: Element): boolean {
  return hasSearchIcon(link) || leafTexts(link).some((t) => matchesLabel('searchIcon', t));
}

/**
 * Um diálogo (post aberto por cima, ex.: a partir do Direct) ou uma página
 * /p/CODE/ mostra um Reel? Olha o post principal e ignora a grade de
 * "mais publicações" que aparece embaixo.
 */
export function primaryPostShowsReel(container: Element): boolean {
  const article = container.matches('article') ? container : container.querySelector('article');
  return containsReel(article ?? container, { ignoreTiles: true });
}

export { instagramPath, classifyPath };
