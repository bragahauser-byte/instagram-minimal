/**
 * Background (service worker no Chrome/Edge/Safari, event page no Firefox).
 * - Mantém a regra declarativeNetRequest que impede abrir links de Reels
 *   carregados diretamente (ex.: colados na barra ou abertos em nova aba).
 * - Agenda a volta do bloqueio quando uma pausa termina (alarms).
 * - Abre a configuração inicial na instalação.
 * Nenhuma requisição de rede é feita aqui.
 */
import { STORAGE_KEY, effectiveFilters, isActive, nextTransitionIn, normalizeState } from '@im/core';
import { REEL_RULE_ID, reelRedirectRule } from '@im/filters';
import { api } from './browser';

const ALARM = 'im-transition';

async function readState() {
  const out = await api.storage.local.get(STORAGE_KEY);
  return normalizeState(out[STORAGE_KEY]);
}

async function sync() {
  const state = await readState();
  const now = Date.now();
  const f = effectiveFilters(state, now);

  try {
    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [REEL_RULE_ID],
      addRules: f.blockReelLinks ? [reelRedirectRule() as unknown as chrome.declarativeNetRequest.Rule] : [],
    });
  } catch (err) {
    // Sem DNR (ou sem suporte a redirect), o content script continua protegendo.
    console.warn('[Instagram Minimal] declarativeNetRequest indisponível', err);
  }

  try {
    await api.alarms.clear(ALARM);
    const next = nextTransitionIn(state, now);
    if (next !== null) await api.alarms.create(ALARM, { when: now + next + 500 });
  } catch {
    /* alarms indisponível: o content script também tem seu próprio timer */
  }

  try {
    const active = isActive(state, now);
    await api.action.setBadgeText({ text: active ? '' : 'off' });
    await api.action.setBadgeBackgroundColor({ color: '#86868B' });
  } catch {
    /* badge é opcional */
  }
}

api.runtime.onInstalled.addListener((details) => {
  void sync();
  if (details.reason === 'install') {
    void api.tabs.create({ url: api.runtime.getURL('options.html#welcome') });
  }
});
api.runtime.onStartup?.addListener(() => void sync());
api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && STORAGE_KEY in changes) void sync();
});
api.alarms?.onAlarm.addListener((a) => {
  if (a.name === ALARM) void sync();
});

void sync();
