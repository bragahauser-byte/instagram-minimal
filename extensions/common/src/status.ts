import type { ExtensionStatus } from '@im/ui';
import { api, INSTAGRAM_ORIGINS, type PingResponse } from './browser';

export async function hasInstagramAccess(): Promise<boolean> {
  try {
    return await api.permissions.contains({ origins: INSTAGRAM_ORIGINS });
  } catch {
    return true; // navegadores sem a API (alguns Safari) concedem na instalação
  }
}

export async function requestInstagramAccess(): Promise<boolean> {
  try {
    return await api.permissions.request({ origins: INSTAGRAM_ORIGINS });
  } catch {
    return false;
  }
}

export async function getExtensionStatus(): Promise<ExtensionStatus> {
  const hasAccess = await hasInstagramAccess();
  if (!hasAccess) return { hasAccess, label: 'Sem acesso ao site' };
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined && tab.url && /^https:\/\/(www\.)?instagram\.com\//.test(tab.url)) {
      const res = (await api.tabs.sendMessage(tab.id, { type: 'im:ping' })) as PingResponse | undefined;
      if (res?.ok) {
        return { hasAccess, label: res.active ? 'Ativa nesta aba' : 'Pausada nesta aba', tone: res.active ? 'ok' : undefined };
      }
      return { hasAccess, label: 'Recarregue a aba' };
    }
  } catch {
    return { hasAccess, label: 'Recarregue a aba do Instagram' };
  }
  return { hasAccess, label: 'Pronta para instagram.com', tone: 'ok' };
}
