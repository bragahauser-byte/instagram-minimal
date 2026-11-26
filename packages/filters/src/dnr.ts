/**
 * Regra declarativeNetRequest usada pelo background. Fica aqui (e não no
 * background) para poder ser testada sem um navegador.
 */
import { REEL_URL_REGEX } from './urls';

export const REEL_RULE_ID = 1;
export const BLOCKED_PAGE = '/blocked.html';

export interface RedirectRule {
  id: number;
  priority: number;
  action: { type: 'redirect'; redirect: { extensionPath: string } };
  condition: { regexFilter: string; resourceTypes: ['main_frame'] };
}

export function reelRedirectRule(): RedirectRule {
  return {
    id: REEL_RULE_ID,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: BLOCKED_PAGE } },
    condition: { regexFilter: REEL_URL_REGEX, resourceTypes: ['main_frame'] },
  };
}
