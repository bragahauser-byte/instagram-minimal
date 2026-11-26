/**
 * Links das lojas. Quando a extensão for aprovada numa loja, cole o link
 * aqui e o botão principal do site vira "Adicionar ao …" com um toque.
 * Enquanto for null, o site mostra a instalação manual daquele navegador.
 */
export const STORES = {
  chrome: null as string | null, // ex.: https://chromewebstore.google.com/detail/<id>
  edge: null as string | null, //   ex.: https://microsoftedge.microsoft.com/addons/detail/<id>
  firefox: null as string | null, // ex.: https://addons.mozilla.org/firefox/addon/instagram-minimal/
  appStore: null as string | null, // ex.: https://apps.apple.com/app/id<id>
};

export const REPO = 'https://github.com/bragahauser-byte/instagram-minimal';
export const DOWNLOAD = (target: 'chromium' | 'firefox') =>
  `${REPO}/releases/latest/download/instagram-minimal-${target}.zip`;
