/**
 * HTML FICTÍCIO que imita a estrutura do instagram.com observada em
 * 26/nov/2026 (ver packages/filters/src/selectors.ts). Nomes, códigos e
 * imagens são inventados. Usado nos testes unitários (jsdom) e no
 * simulador dos testes ponta a ponta (Playwright).
 *
 * Classes CSS aleatórias imitam as geradas pelo Instagram para garantir
 * que os detectores não dependem delas.
 */

const cls = () => `x${Math.random().toString(36).slice(2, 9)}`;
const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const actions = () => `
  <section class="${cls()}">
    <div role="button" tabindex="0"><svg aria-label="Like" role="img"></svg></div>
    <div role="button" tabindex="0"><svg aria-label="Comment" role="img"></svg></div>
    <div role="button" tabindex="0"><svg aria-label="Share" role="img"></svg></div>
    <div role="button" tabindex="0"><svg aria-label="Save" role="img"></svg></div>
  </section>`;

export type PostKind =
  | 'followed' //          foto de conta seguida
  | 'followed-video' //    vídeo comum (não Reel) de conta seguida
  | 'followed-music' //    foto com música (tem link de áudio, mas não é Reel)
  | 'followed-reel' //     Reel de conta seguida
  | 'suggested' //         foto sugerida
  | 'suggested-reel' //    Reel sugerido
  | 'follow-button-only' // conta não seguida, sem o rótulo de sugestão
  | 'sponsored'; //        anúncio

export function post(id: string, kind: PostKind, user = `user_${id}`): string {
  const suggestedLabel = kind === 'suggested' || kind === 'suggested-reel' ? `<span class="${cls()}"><span>Suggested for you</span></span>` : '';
  const followBtn =
    kind === 'suggested' || kind === 'suggested-reel' || kind === 'follow-button-only'
      ? `<div role="button" tabindex="0" class="${cls()}"><div>Follow</div></div>`
      : '';
  const adLabel = kind === 'sponsored' ? `<span class="${cls()}">Ad</span>` : '';
  const isReel = kind === 'followed-reel' || kind === 'suggested-reel';
  let media: string;
  if (isReel) {
    media = `<a href="/reels/R${id}/" class="${cls()}"><div><video playsinline muted data-testid="video-${id}"></video>
      <div role="button"><svg aria-label="Audio is muted" role="img"></svg></div></div></a>`;
  } else if (kind === 'followed-video') {
    media = `<div class="${cls()}"><video playsinline muted data-testid="video-${id}"></video></div>`;
  } else {
    media = `<div class="${cls()}"><img alt="Photo by ${user}" src="${IMG}"></div>`;
  }
  const footerLinks = [
    isReel || kind === 'followed-music' ? `<a href="/reels/audio/90${id}/" class="${cls()}">${user} · Original audio</a>` : '',
    kind === 'sponsored'
      ? `<a href="https://www.facebook.com/ads/ig_redirect/?d=ad${id}" class="${cls()}">Learn more</a>`
      : `<a href="/${user}/p/P${id}/" class="${cls()}"><time>2h</time></a>`,
  ].join('');
  return `<article class="${cls()}" data-testid="post-${id}" data-kind="${kind}">
    <div class="${cls()}">
      <header class="${cls()}">
        <a href="/${user}/"><img alt="${user}'s profile picture" src="${IMG}"></a>
        <div><a href="/${user}/"><span>${user}</span></a>${suggestedLabel}${adLabel}</div>
        ${followBtn}
        <div role="button" tabindex="0"><svg aria-label="More options" role="img"></svg></div>
      </header>
      ${media}
      ${actions()}
      <div>${footerLinks}<span>Legenda fictícia do post ${id}</span></div>
    </div>
  </article>`;
}

/** Carrossel de PESSOAS sugeridas (deve continuar visível). */
export function peopleSuggestions(): string {
  const person = (n: number) => `<div class="${cls()}">
      <a href="/pessoa_${n}/"><img alt="pessoa_${n}'s profile picture" src="${IMG}"></a>
      <a href="/pessoa_${n}/"><span>pessoa_${n}</span></a>
      <button type="button">Follow</button>
    </div>`;
  return `<div class="${cls()}" data-testid="people-suggestions">
    <div><span>Suggested for you</span><a href="/explore/people/">See all</a></div>
    <div>${[1, 2, 3].map(person).join('')}</div>
  </div>`;
}

/** Bloco de descoberta "Suggested reels" no meio do feed (deve sumir). */
export function suggestedReelsBlock(): string {
  return `<div class="${cls()}" data-testid="suggested-reels-block">
    <div><span>Suggested reels</span></div>
    <div>
      <a href="/reel/SR1/"><img alt="" src="${IMG}"><svg aria-label="Reel" role="img"></svg></a>
      <a href="/reel/SR2/"><img alt="" src="${IMG}"><svg aria-label="Reel" role="img"></svg></a>
    </div>
  </div>`;
}

export function storiesTray(): string {
  return `<div class="${cls()}" role="menu" data-testid="stories">
    <div role="menuitem"><a href="/stories/amiga_1/"><img alt="amiga_1's story" src="${IMG}"></a></div>
    <div role="menuitem"><a href="/stories/amigo_2/"><img alt="amigo_2's story" src="${IMG}"></a></div>
  </div>`;
}

export function desktopNav(): string {
  return `<div class="${cls()}" data-testid="nav">
    <a href="/" data-testid="nav-home"><svg aria-label="Home" role="img"></svg><span>Home</span></a>
    <a href="#" role="link" data-testid="nav-search"><svg aria-label="Search" role="img"></svg><span>Search</span></a>
    <a href="/explore/" data-testid="nav-explore"><svg aria-label="Explore" role="img"></svg><span>Explore</span></a>
    <a href="/reels/" data-testid="nav-reels"><svg aria-label="Reels" role="img"></svg><span>Reels</span></a>
    <a href="/direct/inbox/" data-testid="nav-direct"><svg aria-label="Messages" role="img"></svg><span>Messages</span></a>
  </div>`;
}

/** Barra inferior do Instagram no celular: /explore/ é a BUSCA. */
export function mobileNav(): string {
  return `<div class="${cls()}" data-testid="mobile-nav">
    <a href="/"><svg aria-label="Home" role="img"></svg></a>
    <a href="/explore/" data-testid="mobile-search"><svg aria-label="Search" role="img"></svg></a>
    <a href="/reels/" data-testid="mobile-reels"><svg aria-label="Reels" role="img"></svg></a>
  </div>`;
}

export function feed(items: string[]): string {
  return `<main role="main"><div class="${cls()}">${storiesTray()}<div class="${cls()}" data-testid="feed-list">${items
    .map((i) => `<div class="${cls()}">${i}</div>`)
    .join('')}</div></div></main>`;
}

export function defaultFeedItems(): string[] {
  return [
    post('1', 'followed'),
    post('2', 'suggested'),
    post('3', 'sponsored'),
    post('4', 'followed-reel'),
    peopleSuggestions(),
    post('5', 'followed-video'),
    post('6', 'suggested-reel'),
    post('7', 'followed-music'),
    suggestedReelsBlock(),
    post('8', 'follow-button-only'),
  ];
}

/* ------------------------------------------------------------------ Direct */

function bubble(inner: string, from: string): string {
  return `<div class="${cls()}"><div role="article" tabindex="0" class="${cls()}">
      <div role="none"><div role="none">${inner}</div></div>
      <div role="button" aria-label="React to message from ${from}"></div>
    </div></div>`;
}

/** Reel compartilhado: cartão 9:16 [role=button] com svg "Clip" e sem href. */
export function directReelCard(id = 'DR1'): string {
  return bubble(
    `<div role="button" tabindex="0" class="${cls()}" data-testid="direct-reel-${id}" data-open="/p/${id}/" style="width:200px;height:356px">
       <div><img alt="" src="${IMG}"><div><svg aria-label="Clip" role="img"></svg></div></div>
       <span>autor_reel</span>
     </div>`,
    'amiga_1',
  );
}

/** Post (foto) compartilhado: cartão sem ícone de Reel. */
export function directSharedPost(id = 'DP1'): string {
  return bubble(
    `<div role="button" tabindex="0" class="${cls()}" data-testid="direct-post-${id}" data-open="/p/${id}/">
       <div><img alt="" src="${IMG}"></div><span>autor_post</span>
     </div>`,
    'amiga_1',
  );
}

/** Vídeo comum enviado na conversa (gravado/da galeria). Não é Reel. */
export function directNormalVideo(id = 'DV1'): string {
  return bubble(
    `<div role="button" tabindex="0" class="${cls()}" data-testid="direct-video-${id}">
       <video playsinline muted data-testid="direct-video-el-${id}"></video>
       <svg aria-label="Play" role="img"></svg>
     </div>`,
    'amigo_2',
  );
}

export function directText(text: string): string {
  return bubble(`<div dir="auto"><span>${text}</span></div>`, 'amigo_2');
}

/** Link de Reel colado como texto na conversa. */
export function directReelTextLink(): string {
  return bubble(
    `<div dir="auto"><a href="https://www.instagram.com/reel/TXT1/" data-testid="direct-reel-link">https://www.instagram.com/reel/TXT1/</a></div>`,
    'amigo_2',
  );
}

export function directThread(): string {
  return `<main role="main"><div aria-label="Thread list" role="list"><div role="listitem">Conversa fictícia</div></div>
    <div data-testid="thread">
      ${directText('Oi! Tudo bem?')}
      ${directReelCard()}
      ${directSharedPost()}
      ${directNormalVideo()}
      ${directReelTextLink()}
      <div><textarea aria-label="Message"></textarea></div>
    </div></main>`;
}

/* ------------------------------------------------------------------ diálogos e grades */

/** Post aberto por cima (diálogo). `reel` imita um Reel aberto pelo Direct. */
export function postDialog(reel: boolean, id = 'DR1'): string {
  const links = reel
    ? `<a href="/autor_reel/reel/${id}/"><time>1d</time></a><a href="/reels/audio/1306/">autor_reel · Original audio</a>`
    : `<a href="/autor_post/p/${id}/"><time>1d</time></a>`;
  const media = reel ? `<video playsinline muted data-testid="dialog-video"></video>` : `<img alt="" src="${IMG}">`;
  return `<div role="dialog" aria-modal="true" data-testid="dialog"><article>
      <header><a href="/autor/">autor</a></header>
      <div>${media}<div role="button"><svg aria-label="Audio is muted" role="img"></svg></div></div>
      ${actions()}<div>${links}</div>
    </article></div>`;
}

export function exploreGrid(): string {
  const tile = (i: number, reel: boolean) =>
    `<a href="/criador_${i}/p/E${i}/" data-testid="tile-${i}" data-reel="${reel}"><div><img alt="" src="${IMG}"></div>${
      reel ? '<svg aria-label="Reel" role="img"></svg>' : '<svg aria-label="Carousel" role="img"></svg>'
    }</a>`;
  return `<main role="main"><div><input aria-label="Search input" placeholder="Search"></div><div data-testid="grid">${[1, 2, 3, 4, 5, 6]
    .map((i) => tile(i, i % 2 === 0))
    .join('')}</div></main>`;
}

export function profilePage(user = 'amiga_1'): string {
  return `<main role="main"><header><h2>${user}</h2><a href="/${user}/followers/">120 followers</a><a href="/${user}/following/">80 following</a></header>
    <div role="tablist"><a role="tab" href="/${user}/">Posts</a><a role="tab" href="/${user}/reels/" data-testid="profile-reels-tab">Reels</a></div>
    <div data-testid="grid">
      <a href="/${user}/p/G1/" data-testid="ptile-1"><img alt="" src="${IMG}"></a>
      <a href="/${user}/reel/G2/" data-testid="ptile-2"><img alt="" src="${IMG}"><svg aria-label="Clip" role="img"></svg></a>
      <a href="/${user}/p/G3/" data-testid="ptile-3"><img alt="" src="${IMG}"></a>
    </div></main>`;
}

export function storyViewer(): string {
  return `<section data-testid="story-viewer"><div><video playsinline muted data-testid="story-video"></video></div>
    <div role="button"><svg aria-label="Pause" role="img"></svg></div></section>`;
}

export function reelsPage(): string {
  return `<main role="main"><div data-testid="reels-feed"><video playsinline muted data-testid="reels-video"></video></div></main>`;
}

/**
 * Janela flutuante de conversa que o Instagram abre sobre outras telas
 * (observada no Explorar em 26/nov/2026): fica fora do <main>.
 */
export function floatingChat(): string {
  return `<div data-testid="floating-chat"><div><svg aria-label="Close" role="img"></svg></div>
    ${directReelCard('FC1')}${directNormalVideo('FV1')}
    <div><div contenteditable="true" aria-label="Message"></div></div></div>`;
}
