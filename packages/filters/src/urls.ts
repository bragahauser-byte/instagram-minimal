/**
 * Classificação de rotas e links do instagram.com.
 * Baseada em caminhos de URL, que mudam bem menos que o HTML da página.
 */

export type RouteKind =
  | 'feed'
  | 'reel' //            /reel/CODE/, /reels/CODE/, /usuario/reel/CODE/
  | 'reels-tab' //       /reels/
  | 'reels-audio' //     /reels/audio/123/
  | 'profile-reels' //   /usuario/reels/
  | 'explore' //         /explore/
  | 'explore-people' //  /explore/people/ (descoberta de pessoas: sempre liberada)
  | 'explore-other' //   /explore/tags/x/, /explore/locations/x/, /explore/search/...
  | 'direct' //          /direct/...
  | 'stories' //         /stories/...
  | 'post' //            /p/CODE/, /usuario/p/CODE/
  | 'profile' //         /usuario/
  | 'other';

/** Primeiros segmentos que não são nomes de usuário. */
const RESERVED = new Set([
  'explore', 'direct', 'stories', 'accounts', 'p', 'reel', 'reels', 'tv', 'about', 'legal',
  'developer', 'challenge', 'emails', 'oauth', 'web', 'api', 'graphql', 'ajax', 'static',
  'session', 'privacy', 'terms', 'help', 'press', 'business', 'create', 'your_activity',
  'notifications', 'invites', 'meta-verified', 'lite', 'locations', 'topics', 'threads',
]);

const IG_HOST = /^(www\.|m\.)?instagram\.com$/i;

export const REEL_ROUTES: ReadonlySet<RouteKind> = new Set(['reel', 'reels-tab', 'reels-audio', 'profile-reels']);

export function splitPath(pathname: string): string[] {
  return pathname.split(/[?#]/)[0]!.split('/').filter(Boolean);
}

export function classifyPath(pathname: string): RouteKind {
  const seg = splitPath(pathname).map((s) => s.toLowerCase());
  const [a, b, c] = seg;
  if (!a) return 'feed';
  if (a === 'reel') return b ? 'reel' : 'reels-tab';
  if (a === 'reels') {
    if (!b) return 'reels-tab';
    if (b === 'audio') return 'reels-audio';
    return 'reel';
  }
  if (a === 'explore') {
    if (!b) return 'explore';
    if (b === 'people') return 'explore-people';
    return 'explore-other';
  }
  if (a === 'direct') return 'direct';
  if (a === 'stories') return 'stories';
  if (a === 'p' || a === 'tv') return b ? 'post' : 'other';
  if (RESERVED.has(a)) return 'other';
  // /usuario/...
  if (!b) return 'profile';
  if (b === 'reel' && c) return 'reel';
  if (b === 'reels') return 'profile-reels';
  if ((b === 'p' || b === 'tv') && c) return 'post';
  return 'profile';
}

export function isReelRoute(pathname: string): boolean {
  return REEL_ROUTES.has(classifyPath(pathname));
}

/**
 * Converte um href (relativo ou absoluto) em caminho do Instagram.
 * Devolve null para links de outros sites.
 */
export function instagramPath(href: string | null | undefined, base = 'https://www.instagram.com/'): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h || h.startsWith('#') || /^(javascript|mailto|tel):/i.test(h)) return null;
  try {
    const u = new URL(h, base);
    if (!IG_HOST.test(u.hostname)) {
      // Links "l.instagram.com/?u=..." ou de redirecionamento ficam de fora.
      return null;
    }
    return u.pathname;
  } catch {
    return null;
  }
}

/** O link leva a um Reel ou a uma página de Reels? */
export function isReelHref(href: string | null | undefined, base?: string): boolean {
  const path = instagramPath(href, base);
  return path !== null && isReelRoute(path);
}

/** Link para um Reel específico (não a aba nem a página de áudio). */
export function isSpecificReelHref(href: string | null | undefined, base?: string): boolean {
  const path = instagramPath(href, base);
  return path !== null && classifyPath(path) === 'reel';
}

export function isReelAudioHref(href: string | null | undefined, base?: string): boolean {
  const path = instagramPath(href, base);
  return path !== null && classifyPath(path) === 'reels-audio';
}

/** Link de publicação (/p/ ou /usuario/p/) ou de Reel. */
export function isPostOrReelHref(href: string | null | undefined, base?: string): boolean {
  const path = instagramPath(href, base);
  if (path === null) return false;
  const kind = classifyPath(path);
  return kind === 'post' || kind === 'reel';
}

/**
 * Regex (RE2) usada pela regra declarativeNetRequest para bloquear o
 * carregamento direto de páginas de Reels. Mantida aqui para ser testada
 * junto com classifyPath.
 */
export const REEL_URL_REGEX =
  '^https?://(www\\.|m\\.)?instagram\\.com/(reels?/|[A-Za-z0-9._]+/reels?/)';
