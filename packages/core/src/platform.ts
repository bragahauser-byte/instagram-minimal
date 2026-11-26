/** Identificação da plataforma em que a extensão está rodando (só para exibir). */
export type Platform =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'firefox-android'
  | 'safari-macos'
  | 'safari-ios'
  | 'unknown';

export const PLATFORM_LABELS: Record<Platform, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  firefox: 'Mozilla Firefox',
  'firefox-android': 'Firefox para Android',
  'safari-macos': 'Safari para macOS',
  'safari-ios': 'Safari para iPhone',
  unknown: 'Navegador',
};

export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return /Android/.test(ua) ? 'firefox-android' : 'firefox';
  const isSafari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\//.test(ua);
  if (isSafari) {
    if (/iPhone|iPad|iPod/.test(ua)) return 'safari-ios';
    // iPadOS se apresenta como Mac; o toque denuncia.
    if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'safari-ios';
    return 'safari-macos';
  }
  if (/Chrome\//.test(ua)) return 'chrome';
  return 'unknown';
}
