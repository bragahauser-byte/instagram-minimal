/**
 * Modelo de configuração do Instagram Minimal.
 *
 * Tudo aqui é armazenado SOMENTE no armazenamento local da extensão
 * (browser.storage.local). Nada é enviado para servidores.
 */

export type Mode = 'manual' | 'automatic' | 'focus';

export const MODES: readonly Mode[] = ['manual', 'automatic', 'focus'] as const;

export interface Filters {
  /** Aba, botão, páginas e reprodução de Reels. */
  blockReels: boolean;
  /** Cartões de Reels compartilhados no Direct. */
  blockDirectReels: boolean;
  /** Publicações sugeridas no feed (contas que você não segue). */
  blockSuggestedPosts: boolean;
  /** Reels e vídeos curtos no feed, Explorar e grades de perfil. */
  blockShortVideos: boolean;
  /** Publicações patrocinadas quando identificáveis. */
  blockSponsored: boolean;
  /** Oculta a seção Explorar (a pesquisa de pessoas continua). */
  hideExplore: boolean;
  /** Impede que links diretos de Reels abram o conteúdo. */
  blockReelLinks: boolean;
}

export type FilterKey = keyof Filters;

export const FILTER_KEYS: readonly FilterKey[] = [
  'blockReels',
  'blockDirectReels',
  'blockSuggestedPosts',
  'blockShortVideos',
  'blockSponsored',
  'hideExplore',
  'blockReelLinks',
] as const;

export const DEFAULT_FILTERS: Readonly<Filters> = Object.freeze({
  blockReels: true,
  blockDirectReels: true,
  blockSuggestedPosts: true,
  blockShortVideos: true,
  blockSponsored: true,
  hideExplore: true,
  blockReelLinks: true,
});

export const NO_FILTERS: Readonly<Filters> = Object.freeze({
  blockReels: false,
  blockDirectReels: false,
  blockSuggestedPosts: false,
  blockShortVideos: false,
  blockSponsored: false,
  hideExplore: false,
  blockReelLinks: false,
});

export interface State {
  schema: 1;
  /** A pessoa já passou pela configuração inicial. */
  onboarded: boolean;
  mode: Mode;
  /** Usado no modo Manual: ligado ou desligado até a pessoa mudar. */
  enabled: boolean;
  /** Modos Automático e Foco: pausa temporária (epoch ms). */
  pauseUntil: number | null;
  /** Modo Foco: pedido de desbloqueio em andamento. */
  unlockRequestedAt: number | null;
  /** Modo Foco: janela em que mudanças que enfraquecem o bloqueio são aceitas. */
  unlockedUntil: number | null;
  filters: Filters;
  updatedAt: number;
}

export const STORAGE_KEY = 'im:state';

export function defaultState(now = 0): State {
  return {
    schema: 1,
    onboarded: false,
    mode: 'automatic',
    enabled: true,
    pauseUntil: null,
    unlockRequestedAt: null,
    unlockedUntil: null,
    filters: { ...DEFAULT_FILTERS },
    updatedAt: now,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Lê qualquer valor salvo (inclusive corrompido ou de versões antigas)
 * e devolve um estado válido. Nunca lança erro.
 */
export function normalizeState(raw: unknown): State {
  const base = defaultState();
  if (!isObj(raw)) return base;
  const mode = MODES.includes(raw.mode as Mode) ? (raw.mode as Mode) : base.mode;
  const filters: Filters = { ...DEFAULT_FILTERS };
  if (isObj(raw.filters)) {
    for (const key of FILTER_KEYS) {
      const v = raw.filters[key];
      if (typeof v === 'boolean') filters[key] = v;
    }
  }
  return {
    schema: 1,
    onboarded: raw.onboarded === true,
    mode,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    pauseUntil: num(raw.pauseUntil),
    unlockRequestedAt: num(raw.unlockRequestedAt),
    unlockedUntil: num(raw.unlockedUntil),
    filters,
    updatedAt: num(raw.updatedAt) ?? 0,
  };
}

export const MODE_LABELS: Record<Mode, { title: string; description: string }> = {
  manual: {
    title: 'Manual',
    description: 'Você liga e desliga o bloqueador quando quiser.',
  },
  automatic: {
    title: 'Automático',
    description: 'Sempre ativo ao abrir o Instagram. Pausas voltam sozinhas.',
  },
  focus: {
    title: 'Foco permanente',
    description: 'Fica ativo. Desativar exige uma espera e uma confirmação.',
  },
};

export const FILTER_LABELS: Record<FilterKey, { title: string; description: string }> = {
  blockReels: {
    title: 'Reels',
    description: 'Aba, botão, páginas e reprodução de Reels.',
  },
  blockDirectReels: {
    title: 'Reels no Direct',
    description: 'Troca Reels enviados nas conversas por um aviso.',
  },
  blockSuggestedPosts: {
    title: 'Publicações sugeridas',
    description: 'Remove do feed posts de contas que você não segue.',
  },
  blockShortVideos: {
    title: 'Vídeos curtos',
    description: 'Reels no feed, no Explorar e nas grades de perfil.',
  },
  blockSponsored: {
    title: 'Patrocinados',
    description: 'Remove anúncios quando identificáveis.',
  },
  hideExplore: {
    title: 'Ocultar Explorar',
    description: 'Esconde a grade do Explorar. A pesquisa continua.',
  },
  blockReelLinks: {
    title: 'Links diretos de Reels',
    description: 'Impede que links de Reels abram o vídeo.',
  },
};
