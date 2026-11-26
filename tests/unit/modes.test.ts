import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAUSE_MIN,
  FOCUS_COOLDOWN_MS,
  FOCUS_MAX_PAUSE_MIN,
  FOCUS_PHRASE,
  FOCUS_UNLOCK_WINDOW_MS,
  NO_FILTERS,
  defaultState,
  effectiveFilters,
  focusLock,
  isActive,
  nextTransitionIn,
  reduce,
  type Action,
  type Mode,
  type State,
} from '@im/core';

const T0 = 1_700_000_000_000;
const MIN = 60_000;

function onboard(mode: Mode): State {
  const r = reduce(defaultState(T0), { type: 'completeOnboarding', mode }, T0);
  if (!r.ok) throw new Error('onboarding falhou');
  return r.state;
}

function run(s: State, a: Action, now = T0) {
  return reduce(s, a, now);
}

describe('padrões', () => {
  it('antes da configuração inicial o bloqueio já protege', () => {
    const s = defaultState(T0);
    expect(s.onboarded).toBe(false);
    expect(isActive(s, T0)).toBe(true);
    expect(Object.values(effectiveFilters(s, T0)).every(Boolean)).toBe(true);
  });
});

describe('modo Manual', () => {
  it('liga e desliga quando a pessoa quiser, e fica como ficou', () => {
    let s = onboard('manual');
    expect(isActive(s, T0)).toBe(true);
    s = run(s, { type: 'setEnabled', enabled: false }).state;
    expect(isActive(s, T0)).toBe(false);
    expect(isActive(s, T0 + 365 * 24 * 60 * MIN)).toBe(false); // não volta sozinho
    expect(effectiveFilters(s, T0)).toEqual(NO_FILTERS);
    s = run(s, { type: 'setEnabled', enabled: true }).state;
    expect(isActive(s, T0)).toBe(true);
  });

  it('filtros podem ser desligados sem confirmação', () => {
    const r = run(onboard('manual'), { type: 'setFilter', key: 'blockReels', value: false });
    expect(r.ok).toBe(true);
    expect(r.state.filters.blockReels).toBe(false);
  });
});

describe('modo Automático', () => {
  it('desligar vira uma pausa que expira sozinha', () => {
    let s = onboard('automatic');
    s = run(s, { type: 'setEnabled', enabled: false }).state;
    expect(isActive(s, T0)).toBe(false);
    expect(s.pauseUntil).toBe(T0 + DEFAULT_PAUSE_MIN * MIN);
    expect(isActive(s, T0 + DEFAULT_PAUSE_MIN * MIN - 1)).toBe(false);
    expect(isActive(s, T0 + DEFAULT_PAUSE_MIN * MIN)).toBe(true);
  });

  it('pausa com duração escolhida e retomada manual', () => {
    let s = run(onboard('automatic'), { type: 'pause', minutes: 30 }).state;
    expect(nextTransitionIn(s, T0)).toBe(30 * MIN);
    s = run(s, { type: 'resume' }).state;
    expect(isActive(s, T0)).toBe(true);
    expect(nextTransitionIn(s, T0)).toBe(null);
  });

  it('rejeita pausa inválida', () => {
    expect(run(onboard('automatic'), { type: 'pause', minutes: -5 }).ok).toBe(false);
  });
});

describe('modo Foco permanente', () => {
  it('pausar, desligar filtro ou trocar de modo exige desbloqueio', () => {
    const s = onboard('focus');
    expect(run(s, { type: 'pause', minutes: 5 })).toMatchObject({ ok: false, reason: 'locked' });
    expect(run(s, { type: 'setEnabled', enabled: false })).toMatchObject({ ok: false, reason: 'locked' });
    expect(run(s, { type: 'setFilter', key: 'blockReels', value: false })).toMatchObject({ ok: false, reason: 'locked' });
    expect(run(s, { type: 'setMode', mode: 'manual' })).toMatchObject({ ok: false, reason: 'locked' });
    expect(isActive(s, T0)).toBe(true);
  });

  it('reforçar o bloqueio é sempre permitido', () => {
    let s = run(onboard('manual'), { type: 'setFilter', key: 'hideExplore', value: false }).state;
    s = run(s, { type: 'setMode', mode: 'focus' }).state;
    expect(s.mode).toBe('focus');
    const r = run(s, { type: 'setFilter', key: 'hideExplore', value: true });
    expect(r.ok).toBe(true);
    expect(run(r.state, { type: 'resume' }).ok).toBe(true);
  });

  it('desbloqueio: espera de 1 minuto + frase, depois janela de 5 minutos', () => {
    let s = onboard('focus');
    s = run(s, { type: 'requestUnlock' }).state;
    expect(focusLock(s, T0)).toBe('cooling');
    expect(run(s, { type: 'confirmUnlock', phrase: FOCUS_PHRASE }, T0 + 1000)).toMatchObject({ ok: false, reason: 'cooldown' });

    const later = T0 + FOCUS_COOLDOWN_MS;
    expect(focusLock(s, later)).toBe('ready');
    expect(run(s, { type: 'confirmUnlock', phrase: 'qualquer coisa' }, later)).toMatchObject({ ok: false, reason: 'phrase' });

    s = run(s, { type: 'confirmUnlock', phrase: '  Quero   DESATIVAR agora ' }, later).state;
    expect(focusLock(s, later)).toBe('unlocked');

    const p = run(s, { type: 'pause', minutes: 60 }, later + 1000);
    expect(p.ok).toBe(true);
    // Pausa limitada no modo Foco.
    expect(p.state.pauseUntil).toBe(later + 1000 + FOCUS_MAX_PAUSE_MIN * MIN);

    // A janela de desbloqueio termina e tudo volta a exigir confirmação.
    const after = later + FOCUS_UNLOCK_WINDOW_MS + 1;
    expect(focusLock(p.state, after)).toBe('locked');
    expect(run(p.state, { type: 'setFilter', key: 'blockReels', value: false }, after).ok).toBe(false);
  });

  it('a pausa termina sozinha e o bloqueio volta', () => {
    let s = onboard('focus');
    s = run(s, { type: 'requestUnlock' }).state;
    s = run(s, { type: 'confirmUnlock', phrase: FOCUS_PHRASE }, T0 + FOCUS_COOLDOWN_MS).state;
    s = run(s, { type: 'pause', minutes: 10 }, T0 + FOCUS_COOLDOWN_MS).state;
    expect(isActive(s, T0 + FOCUS_COOLDOWN_MS + 5 * MIN)).toBe(false);
    expect(isActive(s, T0 + FOCUS_COOLDOWN_MS + 10 * MIN)).toBe(true);
  });

  it('cancelar e trancar de novo', () => {
    let s = run(onboard('focus'), { type: 'requestUnlock' }).state;
    s = run(s, { type: 'cancelUnlock' }).state;
    expect(focusLock(s, T0 + FOCUS_COOLDOWN_MS)).toBe('locked');
    s = run(s, { type: 'requestUnlock' }).state;
    s = run(s, { type: 'confirmUnlock', phrase: FOCUS_PHRASE }, T0 + FOCUS_COOLDOWN_MS).state;
    s = run(s, { type: 'lock' }, T0 + FOCUS_COOLDOWN_MS).state;
    expect(focusLock(s, T0 + FOCUS_COOLDOWN_MS)).toBe('locked');
  });

  it('nunca é irreversível: depois do desbloqueio dá para sair do modo Foco', () => {
    let s = run(onboard('focus'), { type: 'requestUnlock' }).state;
    s = run(s, { type: 'confirmUnlock', phrase: FOCUS_PHRASE }, T0 + FOCUS_COOLDOWN_MS).state;
    const r = run(s, { type: 'setMode', mode: 'manual' }, T0 + FOCUS_COOLDOWN_MS);
    expect(r.ok).toBe(true);
    expect(r.state.mode).toBe('manual');
    expect(isActive(r.state, T0 + FOCUS_COOLDOWN_MS)).toBe(true);
  });
});

describe('troca de modo', () => {
  it('manual desligado → automático liga de novo', () => {
    let s = run(onboard('manual'), { type: 'setEnabled', enabled: false }).state;
    s = run(s, { type: 'setMode', mode: 'automatic' }).state;
    expect(isActive(s, T0)).toBe(true);
  });

  it('automático pausado → manual fica desligado (sem surpresa)', () => {
    let s = run(onboard('automatic'), { type: 'pause', minutes: 15 }).state;
    s = run(s, { type: 'setMode', mode: 'manual' }).state;
    expect(isActive(s, T0)).toBe(false);
    expect(s.enabled).toBe(false);
  });

  it('restaurar padrões liga todos os filtros', () => {
    let s = run(onboard('manual'), { type: 'setFilter', key: 'blockReels', value: false }).state;
    s = run(s, { type: 'restoreDefaults' }).state;
    expect(Object.values(s.filters).every(Boolean)).toBe(true);
  });
});
