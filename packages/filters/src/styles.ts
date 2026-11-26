/**
 * CSS injetado na página do Instagram. O engine nunca remove nós que o
 * React do Instagram controla: só marca elementos com atributos data-im-*
 * e este CSS esconde ou troca a aparência. Assim a página não quebra.
 */
import type { Filters } from '@im/core';
import { LABELS, SELECTORS } from './selectors';

export const ATTR = {
  hidden: 'data-im-hidden',
  placeholder: 'data-im-placeholder',
  link: 'data-im-link',
} as const;

export const MESSAGES = {
  blocked: 'Este conteúdo foi bloqueado pelo Instagram Minimal.',
  reelBlocked: 'Reel bloqueado.',
  shortVideoBlocked: 'Vídeo curto bloqueado.',
  exploreHidden: 'Explorar está oculto pelo Instagram Minimal. A pesquisa continua disponível.',
} as const;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function buildStyles(f: Filters): string {
  const rules: string[] = [
    `[${ATTR.hidden}]{display:none!important}`,
    `[${ATTR.placeholder}]{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;` +
      `min-height:64px!important;box-sizing:border-box!important;padding:12px 16px!important;border-radius:14px!important;` +
      `background:rgba(134,134,139,.12)!important;cursor:default!important;overflow:hidden!important;text-decoration:none!important}`,
    `[${ATTR.placeholder}]>*{display:none!important}`,
    `[${ATTR.placeholder}]::after{content:attr(${ATTR.placeholder});font:500 13px/1.3 ${FONT};color:#86868B;letter-spacing:-.01em;text-align:center}`,
    `[${ATTR.placeholder}][data-im-size="tile"]{min-height:0!important;height:100%!important;width:100%!important;aspect-ratio:3/4;border-radius:4px!important}`,
    `[${ATTR.link}]{opacity:.55!important;text-decoration:line-through!important;cursor:not-allowed!important}`,
  ];
  if (f.blockReels) {
    // Aba Reels na navegação (desktop e celular) e aba Reels dos perfis.
    rules.push(`${SELECTORS.reelsNavLinks}{display:none!important}`);
  }
  if (f.hideExplore) {
    // Esconde o item Explorar, mas nunca o item de busca (no celular ele aponta para /explore/).
    const notSearch = LABELS.searchIcon.map((l) => `:not(:has(svg[aria-label="${l}"]))`).join('');
    rules.push(`${SELECTORS.exploreNavLink}${notSearch}{display:none!important}`);
  }
  return rules.join('\n');
}

export const OVERLAY_CSS = `
:host{all:initial}
.wrap{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
  background:#FFFFFF;
  font-family:${FONT};color:#1C1C1E;animation:in .18s ease-out}
.card{max-width:340px;padding:32px 28px;text-align:center}
.mark{width:44px;height:44px;margin:0 auto 20px;border-radius:12px;background:#1C1C1E;position:relative}
.mark::after{content:"";position:absolute;left:10px;top:20px;width:17px;height:4px;border-radius:2px;background:#fff}
.mark::before{content:"";position:absolute;width:5px;height:5px;left:30px;top:19.5px;border-radius:50%;background:#007AFF}
h1{font-size:19px;line-height:1.3;font-weight:600;letter-spacing:-.02em;margin:0 0 8px}
p{font-size:14px;line-height:1.45;color:#86868B;margin:0 0 24px}
button{font:inherit;font-size:15px;font-weight:500;border:0;border-radius:980px;padding:11px 22px;cursor:pointer;
  background:#007AFF;color:#fff;transition:transform .12s ease,opacity .12s ease}
button:active{transform:scale(.97);opacity:.85}
button:focus-visible{outline:3px solid rgba(0,122,255,.4);outline-offset:2px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:min(92vw,420px);
  padding:12px 18px;border-radius:14px;background:rgba(28,28,30,.92);color:#fff;font:500 13px/1.35 ${FONT};
  text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.18);animation:up .2s ease-out;pointer-events:none}
.toast.soft{background:rgba(245,245,247,.96);color:#1C1C1E;box-shadow:0 4px 20px rgba(0,0,0,.08)}
@media (prefers-color-scheme:dark){
  .wrap{background:#000000;color:#F5F5F7}
  .mark{background:#F5F5F7}.mark::after{background:#1C1C1E}
  .toast.soft{background:rgba(44,44,46,.96);color:#F5F5F7}
}
@media (prefers-reduced-motion:reduce){.wrap,.toast{animation:none}}
@keyframes in{from{opacity:0}to{opacity:1}}
@keyframes up{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
`;
