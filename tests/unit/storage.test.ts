import { describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  SettingsRepository,
  defaultState,
  detectPlatform,
  extensionArea,
  isActive,
  localStorageArea,
  memoryArea,
  normalizeState,
} from '@im/core';

describe('persistência', () => {
  it('salva e lê de volta após "recarregar" (novo repositório, mesmo armazenamento)', async () => {
    const area = memoryArea();
    const a = new SettingsRepository(area, () => 1000);
    await a.dispatch({ type: 'completeOnboarding', mode: 'manual' });
    await a.dispatch({ type: 'setFilter', key: 'hideExplore', value: false });
    await a.dispatch({ type: 'setEnabled', enabled: false });

    const b = new SettingsRepository(area, () => 2000);
    const s = await b.load();
    expect(s.onboarded).toBe(true);
    expect(s.mode).toBe('manual');
    expect(s.filters.hideExplore).toBe(false);
    expect(isActive(s, 2000)).toBe(false);
  });

  it('ações rejeitadas não são salvas', async () => {
    const area = memoryArea();
    const repo = new SettingsRepository(area, () => 1000);
    await repo.dispatch({ type: 'completeOnboarding', mode: 'focus' });
    const r = await repo.dispatch({ type: 'setFilter', key: 'blockReels', value: false });
    expect(r.ok).toBe(false);
    expect((await repo.load()).filters.blockReels).toBe(true);
  });

  it('avisa quem está inscrito quando muda (popup → content script)', async () => {
    const area = memoryArea();
    const repo = new SettingsRepository(area);
    const cb = vi.fn();
    repo.subscribe(cb);
    await repo.dispatch({ type: 'completeOnboarding', mode: 'automatic' });
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ onboarded: true, mode: 'automatic' }));
  });

  it('dados corrompidos ou antigos viram um estado válido', () => {
    expect(normalizeState(null)).toEqual(defaultState());
    expect(normalizeState('lixo')).toEqual(defaultState());
    const s = normalizeState({ mode: 'turbo', enabled: 'sim', filters: { blockReels: false, extra: 1 }, pauseUntil: 'x' });
    expect(s.mode).toBe('automatic');
    expect(s.enabled).toBe(true);
    expect(s.filters.blockReels).toBe(false);
    expect(s.filters.blockSuggestedPosts).toBe(true);
    expect(s.pauseUntil).toBe(null);
    expect('extra' in s.filters).toBe(false);
  });

  it('o armazenamento só contém a configuração (nada de conta, senha ou conteúdo)', async () => {
    const area = memoryArea();
    await new SettingsRepository(area).dispatch({ type: 'completeOnboarding', mode: 'manual' });
    expect(Object.keys(area.dump())).toEqual([STORAGE_KEY]);
    expect(Object.keys(area.dump()[STORAGE_KEY] as object).sort()).toEqual(
      ['enabled', 'filters', 'mode', 'onboarded', 'pauseUntil', 'schema', 'unlockRequestedAt', 'unlockedUntil', 'updatedAt'].sort(),
    );
  });

  it('localStorage (painel de demonstração)', async () => {
    localStorage.clear();
    const repo = new SettingsRepository(localStorageArea(localStorage, 'demo:'));
    await repo.dispatch({ type: 'completeOnboarding', mode: 'automatic' });
    expect(JSON.parse(localStorage.getItem('demo:' + STORAGE_KEY)!).mode).toBe('automatic');
    expect((await new SettingsRepository(localStorageArea(localStorage, 'demo:')).load()).onboarded).toBe(true);
  });

  it('browser.storage.local (extensão), inclusive eventos de mudança', async () => {
    const data: Record<string, unknown> = {};
    const listeners: ((c: Record<string, { newValue?: unknown }>, area: string) => void)[] = [];
    const fake = {
      storage: {
        local: {
          get: async (k: string) => ({ [k]: data[k] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(data, items);
            for (const l of listeners) l(Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { newValue: v }])), 'local');
          },
        },
        onChanged: {
          addListener: (l: (typeof listeners)[number]) => listeners.push(l),
          removeListener: () => {},
        },
      },
    };
    const repo = new SettingsRepository(extensionArea(fake));
    const cb = vi.fn();
    repo.subscribe(cb);
    await repo.dispatch({ type: 'completeOnboarding', mode: 'focus' });
    expect((data[STORAGE_KEY] as { mode: string }).mode).toBe('focus');
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ mode: 'focus' }));
  });
});

describe('plataforma', () => {
  const UA = {
    chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
    fxa: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  };
  it('identifica cada navegador suportado', () => {
    expect(detectPlatform(UA.chrome)).toBe('chrome');
    expect(detectPlatform(UA.edge)).toBe('edge');
    expect(detectPlatform(UA.firefox)).toBe('firefox');
    expect(detectPlatform(UA.fxa)).toBe('firefox-android');
    expect(detectPlatform(UA.mac)).toBe('safari-macos');
    expect(detectPlatform(UA.mac, 5)).toBe('safari-ios'); // iPad
    expect(detectPlatform(UA.ios)).toBe('safari-ios');
  });
});
