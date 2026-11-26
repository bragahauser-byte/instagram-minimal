import { describe, expect, it } from 'vitest';
import {
  REEL_URL_REGEX,
  classifyPath,
  instagramPath,
  isPostOrReelHref,
  isReelHref,
  isReelRoute,
  isSpecificReelHref,
  reelRedirectRule,
} from '@im/filters';

describe('classifyPath', () => {
  const cases: [string, string][] = [
    ['/', 'feed'],
    ['/reels/', 'reels-tab'],
    ['/reels/C9xYz_1/', 'reel'],
    ['/reel/C9xYz_1/', 'reel'],
    ['/reel/C9xYz_1', 'reel'],
    ['/reels/audio/123456/', 'reels-audio'],
    ['/maria.silva/reel/C9xYz_1/', 'reel'],
    ['/maria.silva/reels/', 'profile-reels'],
    ['/maria.silva/', 'profile'],
    ['/maria.silva/p/ABC/', 'post'],
    ['/maria.silva/followers/', 'profile'],
    ['/p/ABC123/', 'post'],
    ['/explore/', 'explore'],
    ['/explore/people/', 'explore-people'],
    ['/explore/tags/praia/', 'explore-other'],
    ['/explore/search/keyword/', 'explore-other'],
    ['/direct/inbox/', 'direct'],
    ['/direct/t/113411136717660/', 'direct'],
    ['/stories/amiga_1/3412/', 'stories'],
    ['/accounts/edit/', 'other'],
    ['/REELS/', 'reels-tab'],
  ];
  it.each(cases)('%s → %s', (path, kind) => {
    expect(classifyPath(path)).toBe(kind);
  });
});

describe('links', () => {
  it('reconhece links de Reels relativos e absolutos', () => {
    expect(isReelHref('/reel/ABC/')).toBe(true);
    expect(isReelHref('https://www.instagram.com/reel/ABC/?igsh=xyz')).toBe(true);
    expect(isReelHref('https://instagram.com/reels/ABC/')).toBe(true);
    expect(isReelHref('https://m.instagram.com/reel/ABC/')).toBe(true);
    expect(isReelHref('/fulano/reel/ABC/')).toBe(true);
    expect(isReelHref('/reels/')).toBe(true);
  });

  it('não confunde posts, perfis, Direct e outros sites', () => {
    expect(isReelHref('/p/ABC/')).toBe(false);
    expect(isReelHref('/fulano/')).toBe(false);
    expect(isReelHref('/direct/t/1/')).toBe(false);
    expect(isReelHref('/stories/fulano/1/')).toBe(false);
    expect(isReelHref('https://example.com/reel/ABC/')).toBe(false);
    expect(isReelHref('https://www.facebook.com/reel/ABC/')).toBe(false);
    expect(isReelHref('#')).toBe(false);
    expect(isReelHref('javascript:void(0)')).toBe(false);
    expect(isReelHref(null)).toBe(false);
  });

  it('diferencia link de Reel específico de página de áudio', () => {
    expect(isSpecificReelHref('/reels/audio/123/')).toBe(false);
    expect(isSpecificReelHref('/reels/ABC/')).toBe(true);
  });

  it('isPostOrReelHref', () => {
    expect(isPostOrReelHref('/u/p/X/')).toBe(true);
    expect(isPostOrReelHref('/reel/X/')).toBe(true);
    expect(isPostOrReelHref('/u/')).toBe(false);
  });

  it('instagramPath ignora outros domínios', () => {
    expect(instagramPath('https://l.instagram.com/?u=x')).toBe(null);
    expect(instagramPath('/explore/')).toBe('/explore/');
  });
});

describe('regra declarativeNetRequest', () => {
  const re = new RegExp(REEL_URL_REGEX);
  const block = [
    'https://www.instagram.com/reel/ABC/',
    'https://www.instagram.com/reels/ABC/',
    'https://www.instagram.com/reels/',
    'https://instagram.com/reel/ABC/?igsh=1',
    'https://m.instagram.com/reel/ABC/',
    'https://www.instagram.com/maria.silva/reel/ABC/',
    'https://www.instagram.com/maria.silva/reels/',
    'https://www.instagram.com/reels/audio/123/',
  ];
  const allow = [
    'https://www.instagram.com/',
    'https://www.instagram.com/p/ABC/',
    'https://www.instagram.com/maria.silva/',
    'https://www.instagram.com/direct/t/1/',
    'https://www.instagram.com/stories/maria/1/',
    'https://www.instagram.com/explore/people/',
    'https://www.instagram.com/maria.silva/p/ABC/',
    'https://evil.com/www.instagram.com/reel/ABC/',
  ];
  it.each(block)('bloqueia %s', (u) => expect(re.test(u)).toBe(true));
  it.each(allow)('libera %s', (u) => expect(re.test(u)).toBe(false));

  it('concorda com classifyPath em todas as URLs', () => {
    for (const u of [...block, ...allow.slice(0, -1)]) {
      expect(re.test(u)).toBe(isReelRoute(new URL(u).pathname));
    }
  });

  it('redireciona só a navegação principal para a página de bloqueio', () => {
    const rule = reelRedirectRule();
    expect(rule.action).toEqual({ type: 'redirect', redirect: { extensionPath: '/blocked.html' } });
    expect(rule.condition.resourceTypes).toEqual(['main_frame']);
  });
});
