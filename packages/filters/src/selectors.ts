/**
 * CAMADA CENTRAL DE IDENTIFICAÇÃO
 * --------------------------------
 * Todo seletor e todo texto usado para reconhecer partes do Instagram
 * fica aqui. Quando o Instagram mudar a interface, este é o primeiro
 * (e quase sempre o único) arquivo a atualizar. Ver docs/selectors.md.
 *
 * Princípios:
 * - Nada de classes CSS geradas (ex.: "x1lliihq"): mudam a cada deploy.
 * - Preferir caminhos de URL em href, atributos ARIA (role, aria-label)
 *   e a estrutura semântica (article, dialog, nav).
 * - Textos visíveis só como sinal complementar e sempre em lista
 *   multilíngue (pt-BR, en, es), com comparação exata em nós-folha.
 *
 * Observado no instagram.com em 26/nov/2026 (web, desktop, logado):
 * - Item "Reels" da navegação: <a href="/reels/"> com <svg aria-label="Reels">.
 * - Post do feed: <article>; sugestão traz "Suggested for you" e botão "Follow".
 * - Anúncio: link para facebook.com/ads/ig_redirect e o rótulo "Ad".
 * - Reel no feed: links /reels/CODE/ e /reels/audio/ID/ e um <video>.
 * - Reel enviado no Direct: cartão [role=button] 9:16 com <svg aria-label="Clip">,
 *   sem href; ao clicar abre um [role=dialog] em /p/CODE/ cujo conteúdo traz
 *   links /usuario/reel/CODE/ e /reels/audio/ID/. Fechar pelo botão do diálogo
 *   (<svg aria-label="Close">) ou com Esc volta para a conversa; history.back() não.
 * - O Instagram também abre uma janela flutuante de conversa sobre outras
 *   telas (Explorar, feed): mesmos cartões, mesma estrutura de mensagem.
 * - Explorar: blocos <a href="/usuario/p/CODE/"> com <svg aria-label="Reel">.
 */

export const LABELS = {
  /** aria-label do ícone que marca Reels/clipes em cartões e grades. */
  reelIcon: ['Reel', 'Reels', 'Clip', 'Clips', 'Clipe', 'Clipes', 'Vídeo do Reels'],
  /** Ícone de busca: o item /explore/ com este ícone é a busca (celular) e nunca é escondido. */
  searchIcon: ['Search', 'Pesquisar', 'Pesquisa', 'Buscar', 'Busca', 'Search and explore'],
  /** Rótulo de publicação sugerida no cabeçalho do post. */
  suggested: [
    'Suggested for you', 'Suggested post', 'Suggested posts', 'Suggested',
    'Sugestões para você', 'Sugerido para você', 'Sugestão para você', 'Sugerida para você',
    'Publicação sugerida', 'Publicações sugeridas', 'Recomendado para você',
    'Sugerencias para ti', 'Sugerido para ti', 'Publicación sugerida',
  ],
  /** Rótulo de anúncio. "Paid partnership" NÃO entra: é parceria de conta seguida. */
  sponsored: ['Sponsored', 'Ad', 'Patrocinado', 'Patrocinada', 'Anúncio', 'Publicidade', 'Publicidad'],
  /** Botão "Seguir" num post do feed = conta que você não segue. */
  follow: ['Follow', 'Seguir', 'Follow back', 'Seguir de volta', 'Seguir también'],
  /** Botão de fechar diálogos (usado pelo "Voltar" da tela de bloqueio). */
  close: ['Close', 'Fechar', 'Cerrar'],
  /** Cabeçalhos de blocos de descoberta de conteúdo dentro do feed. */
  suggestedContentHeadings: [
    'Suggested posts', 'Suggested reels', 'Suggested for you reels', 'Reels for you',
    'Publicações sugeridas', 'Reels sugeridos', 'Sugestões de reels', 'Reels para você',
    'Publicaciones sugeridas', 'Reels sugeridos para ti',
  ],
} as const;

export const SELECTORS = {
  /** Links de navegação para a aba Reels e para a aba Reels de um perfil. */
  reelsNavLinks: 'a[href="/reels/"], a[href$="/reels/"]',
  /** Link da seção Explorar (desktop: item "Explore"; celular: pode ser a busca). */
  exploreNavLink: 'a[href="/explore/"]',
  feedArticle: 'article',
  dialog: '[role="dialog"]',
  /** Bolha de mensagem no Direct (e na janela flutuante de conversa). */
  message: '[role="article"]',
  main: 'main, [role="main"]',
  labeledSvg: 'svg[aria-label]',
  button: 'button, [role="button"]',
  anchor: 'a[href]',
  adLink: 'a[href*="facebook.com/ads/"], a[href*="/ads/ig_redirect"]',
  video: 'video',
  media: 'img, video',
} as const;

const norm = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

const lower = (list: readonly string[]) => new Set(list.map((s) => s.toLowerCase()));

const LABEL_SETS = {
  reelIcon: lower(LABELS.reelIcon),
  searchIcon: lower(LABELS.searchIcon),
  suggested: lower(LABELS.suggested),
  sponsored: lower(LABELS.sponsored),
  follow: lower(LABELS.follow),
  close: lower(LABELS.close),
  suggestedContentHeadings: lower(LABELS.suggestedContentHeadings),
};

export type LabelGroup = keyof typeof LABEL_SETS;

export function matchesLabel(group: LabelGroup, text: string | null | undefined): boolean {
  return LABEL_SETS[group].has(norm(text).toLowerCase());
}

/** Texto de nós-folha (sem filhos elemento), limitado para não pesar. */
export function leafTexts(root: Element, max = 400): string[] {
  const out: string[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 1 /* SHOW_ELEMENT */);
  let n: Node | null = walker.currentNode;
  while (n && out.length < max) {
    const el = n as Element;
    if (el.childElementCount === 0) {
      const t = norm(el.textContent);
      if (t && t.length <= 60) out.push(t);
    }
    n = walker.nextNode();
  }
  return out;
}

export function hasLeafLabel(root: Element, group: LabelGroup): boolean {
  return leafTexts(root).some((t) => matchesLabel(group, t));
}

export function svgLabels(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll(SELECTORS.labeledSvg), (s) => s.getAttribute('aria-label') ?? '');
}

export function hasReelIcon(root: ParentNode): boolean {
  return svgLabels(root).some((l) => matchesLabel('reelIcon', l));
}

export function hasSearchIcon(root: ParentNode): boolean {
  return svgLabels(root).some((l) => matchesLabel('searchIcon', l));
}
