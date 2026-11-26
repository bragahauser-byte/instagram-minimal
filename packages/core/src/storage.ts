/**
 * Camada de armazenamento. A extensão usa browser.storage.local; o painel
 * de demonstração (GitHub Pages) usa localStorage. Ambos implementam a
 * mesma interface, então a interface e as regras são compartilhadas.
 */
import { reduce, type Action, type Result } from './modes';
import { STORAGE_KEY, normalizeState, type State } from './settings';

export interface KeyValueArea {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  /** Chama `cb` quando a chave muda (inclusive em outra aba ou contexto). */
  subscribe(key: string, cb: (value: unknown) => void): () => void;
}

export class SettingsRepository {
  constructor(
    private readonly area: KeyValueArea,
    private readonly clock: () => number = () => Date.now(),
  ) {}

  async load(): Promise<State> {
    try {
      return normalizeState(await this.area.get(STORAGE_KEY));
    } catch {
      return normalizeState(undefined);
    }
  }

  async save(state: State): Promise<void> {
    await this.area.set(STORAGE_KEY, state);
  }

  /** Lê o estado mais recente, aplica a ação e salva se for aceita. */
  async dispatch(action: Action): Promise<Result> {
    const current = await this.load();
    const result = reduce(current, action, this.clock());
    if (result.ok) await this.save(result.state);
    return result;
  }

  subscribe(cb: (state: State) => void): () => void {
    return this.area.subscribe(STORAGE_KEY, (v) => cb(normalizeState(v)));
  }
}

/** Armazenamento em memória (testes). */
export function memoryArea(initial: Record<string, unknown> = {}): KeyValueArea & { dump(): Record<string, unknown> } {
  const data = new Map<string, unknown>(Object.entries(initial));
  const subs = new Map<string, Set<(v: unknown) => void>>();
  return {
    async get(key) {
      return structuredClone(data.get(key));
    },
    async set(key, value) {
      data.set(key, structuredClone(value));
      subs.get(key)?.forEach((cb) => cb(structuredClone(value)));
    },
    subscribe(key, cb) {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key)!.add(cb);
      return () => subs.get(key)?.delete(cb);
    },
    dump: () => Object.fromEntries(data),
  };
}

/** localStorage (painel de demonstração). */
export function localStorageArea(storage: Storage = window.localStorage, prefix = ''): KeyValueArea {
  const subs = new Map<string, Set<(v: unknown) => void>>();
  const read = (key: string) => {
    const raw = storage.getItem(prefix + key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (!e.key?.startsWith(prefix)) return;
      const key = e.key.slice(prefix.length);
      subs.get(key)?.forEach((cb) => cb(read(key)));
    });
  }
  return {
    async get(key) {
      return read(key);
    },
    async set(key, value) {
      storage.setItem(prefix + key, JSON.stringify(value));
      subs.get(key)?.forEach((cb) => cb(value));
    },
    subscribe(key, cb) {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key)!.add(cb);
      return () => subs.get(key)?.delete(cb);
    },
  };
}

type ChromeLikeStorage = {
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    onChanged: {
      addListener(cb: (changes: Record<string, { newValue?: unknown }>, area: string) => void): void;
      removeListener(cb: (changes: Record<string, { newValue?: unknown }>, area: string) => void): void;
    };
  };
};

/** browser.storage.local / chrome.storage.local (extensão). */
export function extensionArea(api: ChromeLikeStorage): KeyValueArea {
  return {
    async get(key) {
      const out = await api.storage.local.get(key);
      return out[key];
    },
    async set(key, value) {
      await api.storage.local.set({ [key]: value });
    },
    subscribe(key, cb) {
      const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area === 'local' && key in changes) cb(changes[key]?.newValue);
      };
      api.storage.onChanged.addListener(listener);
      return () => api.storage.onChanged.removeListener(listener);
    },
  };
}
