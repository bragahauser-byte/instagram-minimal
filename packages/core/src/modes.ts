/**
 * Regras dos três modos de funcionamento. Funções puras: recebem o estado
 * e o horário atual e devolvem um novo estado. Isso torna tudo testável.
 *
 * - Manual: `enabled` decide. Fica como a pessoa deixou.
 * - Automático: sempre ativo; desligar vira uma pausa curta que expira sozinha.
 * - Foco permanente: qualquer mudança que enfraqueça o bloqueio exige
 *   pedir desbloqueio, esperar FOCUS_COOLDOWN_MS e digitar FOCUS_PHRASE.
 *   O desbloqueio vale por FOCUS_UNLOCK_WINDOW_MS e pausas têm limite.
 *
 * Nada aqui é irreversível: a pessoa sempre pode concluir o desbloqueio
 * ou remover a extensão pelo navegador.
 */
import { DEFAULT_FILTERS, NO_FILTERS, type FilterKey, type Filters, type Mode, type State } from './settings';

export const FOCUS_COOLDOWN_MS = 60_000;
export const FOCUS_UNLOCK_WINDOW_MS = 5 * 60_000;
export const FOCUS_MAX_PAUSE_MIN = 10;
export const FOCUS_PHRASE = 'quero desativar agora';
export const DEFAULT_PAUSE_MIN = 15;
export const PAUSE_OPTIONS_MIN = [5, 15, 30, 60] as const;

export type Action =
  | { type: 'completeOnboarding'; mode: Mode }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setEnabled'; enabled: boolean }
  | { type: 'pause'; minutes: number }
  | { type: 'resume' }
  | { type: 'setFilter'; key: FilterKey; value: boolean }
  | { type: 'requestUnlock' }
  | { type: 'confirmUnlock'; phrase: string }
  | { type: 'cancelUnlock' }
  | { type: 'lock' }
  | { type: 'restoreDefaults' };

export type Rejection = 'locked' | 'cooldown' | 'phrase' | 'not-requested' | 'invalid';

export type Result = { ok: true; state: State } | { ok: false; state: State; reason: Rejection };

/** O bloqueador está agindo agora? */
export function isActive(s: State, now: number): boolean {
  if (s.mode === 'manual') return s.enabled;
  return s.pauseUntil === null || now >= s.pauseUntil;
}

/** Filtros que valem neste momento (todos falsos quando inativo). */
export function effectiveFilters(s: State, now: number): Filters {
  return isActive(s, now) ? { ...s.filters } : { ...NO_FILTERS };
}

/** Milissegundos até a próxima mudança automática de estado, ou null. */
export function nextTransitionIn(s: State, now: number): number | null {
  const times = [s.pauseUntil, s.unlockedUntil].filter((t): t is number => t !== null && t > now);
  if (s.unlockRequestedAt !== null) {
    const ready = s.unlockRequestedAt + FOCUS_COOLDOWN_MS;
    if (ready > now) times.push(ready);
  }
  return times.length ? Math.min(...times) - now : null;
}

export type FocusLock = 'locked' | 'cooling' | 'ready' | 'unlocked';

export function focusLock(s: State, now: number): FocusLock {
  if (s.unlockedUntil !== null && now < s.unlockedUntil) return 'unlocked';
  if (s.unlockRequestedAt !== null) {
    return now - s.unlockRequestedAt >= FOCUS_COOLDOWN_MS ? 'ready' : 'cooling';
  }
  return 'locked';
}

export function cooldownRemaining(s: State, now: number): number {
  if (s.unlockRequestedAt === null) return FOCUS_COOLDOWN_MS;
  return Math.max(0, s.unlockRequestedAt + FOCUS_COOLDOWN_MS - now);
}

const STRENGTH: Record<Mode, number> = { manual: 0, automatic: 1, focus: 2 };

/** A ação deixa o bloqueio mais fraco? (exige desbloqueio no modo Foco) */
export function isWeakening(s: State, a: Action, now: number): boolean {
  switch (a.type) {
    case 'setEnabled':
      return !a.enabled && isActive(s, now);
    case 'pause':
      return true;
    case 'setFilter':
      return s.filters[a.key] && !a.value;
    case 'setMode':
    case 'completeOnboarding':
      return STRENGTH[a.mode] < STRENGTH[s.mode];
    case 'restoreDefaults':
      return false;
    default:
      return false;
  }
}

/** O modo Foco exige desbloqueio para esta ação agora? */
export function requiresUnlock(s: State, a: Action, now: number): boolean {
  return s.mode === 'focus' && isWeakening(s, a, now) && focusLock(s, now) !== 'unlocked';
}

const normalizePhrase = (p: string) => p.trim().toLowerCase().replace(/\s+/g, ' ');

export function reduce(s: State, a: Action, now: number): Result {
  const ok = (patch: Partial<State>): Result => ({ ok: true, state: { ...s, ...patch, updatedAt: now } });
  const no = (reason: Rejection): Result => ({ ok: false, state: s, reason });

  if (requiresUnlock(s, a, now)) return no('locked');

  switch (a.type) {
    case 'completeOnboarding':
      return ok({
        onboarded: true,
        mode: a.mode,
        enabled: true,
        pauseUntil: null,
        unlockRequestedAt: null,
        unlockedUntil: null,
      });

    case 'setMode': {
      if (a.mode === s.mode) return ok({});
      const active = isActive(s, now);
      return ok({
        mode: a.mode,
        // Ao mudar de modo o bloqueador continua como estava para a pessoa.
        enabled: a.mode === 'manual' ? active : true,
        pauseUntil: a.mode === 'manual' ? null : active ? null : s.pauseUntil,
        unlockRequestedAt: null,
        unlockedUntil: a.mode === 'focus' ? null : s.unlockedUntil,
      });
    }

    case 'setEnabled':
      if (s.mode === 'manual') return ok({ enabled: a.enabled });
      if (a.enabled) return ok({ pauseUntil: null });
      return reduce(s, { type: 'pause', minutes: DEFAULT_PAUSE_MIN }, now);

    case 'pause': {
      if (s.mode === 'manual') return ok({ enabled: false });
      if (!Number.isFinite(a.minutes) || a.minutes <= 0) return no('invalid');
      const minutes = s.mode === 'focus' ? Math.min(a.minutes, FOCUS_MAX_PAUSE_MIN) : a.minutes;
      return ok({ pauseUntil: now + minutes * 60_000 });
    }

    case 'resume':
      return ok({ pauseUntil: null, enabled: true });

    case 'setFilter':
      return ok({ filters: { ...s.filters, [a.key]: a.value } });

    case 'requestUnlock':
      if (s.mode !== 'focus') return no('invalid');
      return ok({ unlockRequestedAt: now });

    case 'confirmUnlock': {
      if (s.mode !== 'focus') return no('invalid');
      if (s.unlockRequestedAt === null) return no('not-requested');
      if (now - s.unlockRequestedAt < FOCUS_COOLDOWN_MS) return no('cooldown');
      if (normalizePhrase(a.phrase) !== FOCUS_PHRASE) return no('phrase');
      return ok({ unlockRequestedAt: null, unlockedUntil: now + FOCUS_UNLOCK_WINDOW_MS });
    }

    case 'cancelUnlock':
      return ok({ unlockRequestedAt: null });

    case 'lock':
      return ok({ unlockRequestedAt: null, unlockedUntil: null });

    case 'restoreDefaults':
      return ok({ filters: { ...DEFAULT_FILTERS } });
  }
}
