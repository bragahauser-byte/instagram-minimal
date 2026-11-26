/**
 * Instagram Minimal como userscript: o mesmo motor de bloqueio da extensão,
 * para rodar de graça no celular, sem loja paga:
 *   - iPhone: Safari + app gratuito "Userscripts"
 *   - Android: Firefox + Violentmonkey ou Tampermonkey
 *
 * Todos os bloqueios ligados. Para pausar, desligue o script no app.
 * Não faz requisições de rede e não guarda nada.
 */
import { DEFAULT_FILTERS } from '@im/core';
import { BlockerEngine } from '@im/filters';

declare global {
  interface Window {
    __instagramMinimalUserscript?: BlockerEngine;
  }
}

function start() {
  if (window.__instagramMinimalUserscript) return; // já rodando (script instalado duas vezes)
  const engine = new BlockerEngine();
  engine.setFilters({ ...DEFAULT_FILTERS });
  engine.start();
  window.__instagramMinimalUserscript = engine;
}

if (document.documentElement) start();
else document.addEventListener('readystatechange', start, { once: true });
