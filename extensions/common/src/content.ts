/**
 * Content script: roda só em instagram.com (ver manifest), no início do
 * carregamento. Lê a configuração local e entrega os filtros ao engine.
 * Não faz nenhuma requisição de rede e não lê mensagens: só olha a
 * estrutura da página para decidir o que esconder.
 */
import { SettingsRepository, defaultState, effectiveFilters, extensionArea, nextTransitionIn, type State } from '@im/core';
import { BlockerEngine } from '@im/filters';
import { api, type PingResponse } from './browser';

const engine = new BlockerEngine();
const repo = new SettingsRepository(extensionArea(api));
let current: State = defaultState();
let timer: number | undefined;

function apply(state: State) {
  current = state;
  const now = Date.now();
  engine.setFilters(effectiveFilters(state, now));
  // Pausas terminam sozinhas: reaplica no momento certo.
  window.clearTimeout(timer);
  const next = nextTransitionIn(state, now);
  if (next !== null) timer = window.setTimeout(() => apply(current), next + 50);
}

// Até a configuração chegar (poucos ms), vale o padrão protetor.
engine.setFilters(effectiveFilters(current, Date.now()));
engine.start();
repo.load().then(apply).catch(() => apply(defaultState()));
repo.subscribe(apply);

// Ao voltar para a aba, confere se alguma pausa expirou.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') apply(current);
});

api.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if ((msg as { type?: string } | null)?.type !== 'im:ping') return;
  const r = engine.lastReport;
  const res: PingResponse = {
    ok: true,
    active: engine.active,
    route: r?.route ?? 'other',
    hidden: r ? Object.values(r.hidden).reduce((a, b) => a + b, 0) : 0,
    placeholders: r?.placeholders ?? 0,
    overlay: engine.getOverlay() !== null,
  };
  sendResponse(res);
  return false;
});
