/**
 * Acesso à API de extensões. Firefox e Safari expõem `browser` (promessas);
 * Chrome e Edge expõem `chrome` (promessas no MV3). Ambos têm a mesma forma
 * para o que usamos aqui.
 */
declare const browser: typeof chrome | undefined;

export const api: typeof chrome =
  typeof browser !== 'undefined' && browser?.runtime ? browser : chrome;

export const INSTAGRAM_ORIGINS = ['https://www.instagram.com/*', 'https://instagram.com/*'];

export type PingResponse = {
  ok: true;
  active: boolean;
  route: string;
  hidden: number;
  placeholders: number;
  overlay: boolean;
};
