/**
 * Instagram Minimal como userscript: o mesmo motor de bloqueio da extensão,
 * de graça em qualquer aparelho, com um gerenciador de scripts gratuito:
 *   - iPhone e Mac: Safari + app "Userscripts"
 *   - Android: Firefox + Violentmonkey
 *   - Computador: Chrome/Edge + Tampermonkey, Firefox + Violentmonkey
 *
 * Todos os bloqueios ligados. Para pausar, desligue o script no app.
 * Não faz requisições de rede e não guarda nada.
 */
import { DEFAULT_FILTERS } from '@im/core';
import { BlockerEngine } from '@im/filters';

declare const __VERSION__: string;

declare global {
  interface Window {
    __instagramMinimalUserscript?: BlockerEngine;
  }
}

/**
 * No site do projeto, o script só avisa que está instalado (para o site
 * mostrar "✓ Instalado"). Não lê nada da página nem envia nada.
 */
function signalInstalled() {
  const mark = () => {
    document.documentElement.setAttribute('data-im-installed', __VERSION__);
    document.dispatchEvent(new CustomEvent('instagram-minimal:installed', { detail: __VERSION__ }));
  };
  if (document.documentElement) mark();
  document.addEventListener('DOMContentLoaded', mark, { once: true });
}

function start() {
  if (window.__instagramMinimalUserscript) return; // já rodando (script instalado duas vezes)
  const engine = new BlockerEngine();
  engine.setFilters({ ...DEFAULT_FILTERS });
  engine.start();
  window.__instagramMinimalUserscript = engine;
}

if (/(^|\.)instagram\.com$/.test(location.hostname)) {
  if (document.documentElement) start();
  else document.addEventListener('readystatechange', start, { once: true });
} else {
  signalInstalled();
}
