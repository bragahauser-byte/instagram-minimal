/**
 * BlockerEngine: aplica os filtros na página do Instagram.
 *
 * Camadas de proteção (da mais visível para a mais profunda):
 * 1. CSS: esconde a aba Reels e o Explorar antes mesmo da página desenhar.
 * 2. Varredura (MutationObserver + debounce): marca posts sugeridos,
 *    anúncios, Reels no feed/grades e cartões de Reels no Direct.
 * 3. Cliques: links de Reels e cartões bloqueados não abrem.
 * 4. Rota: se a URL virar uma página de Reels (ou um diálogo mostrar um
 *    Reel), uma tela de bloqueio cobre tudo e os vídeos são pausados.
 * 5. (Fora daqui) declarativeNetRequest redireciona carregamentos diretos.
 *
 * Cuidados: nunca remove nós do React do Instagram, só usa atributos;
 * observa apenas childList (as próprias marcações não disparam novas
 * varreduras, então não há laço infinito); cada detector roda em try/catch.
 */
import { NO_FILTERS, type Filters } from '@im/core';
import {
  classifyFeedArticle,
  findDirectReelCards,
  findGridTiles,
  findSuggestedContentBlocks,
  primaryPostShowsReel,
} from './classify';
import { SELECTORS, matchesLabel } from './selectors';
import { ATTR, MESSAGES, OVERLAY_CSS, buildStyles } from './styles';
import { REEL_ROUTES, classifyPath, isReelHref, type RouteKind } from './urls';

type Mark =
  | { kind: 'hidden'; reason: string }
  | { kind: 'placeholder'; text: string; size?: 'tile' }
  | { kind: 'link' };

export interface ScanReport {
  route: RouteKind;
  hidden: Record<string, number>;
  placeholders: number;
  links: number;
  overlay: OverlayReason | null;
  errors: number;
}

export type OverlayReason = 'reel';

export interface EngineOptions {
  doc?: Document;
  win?: Window;
  /** Intervalo mínimo entre varreduras (ms). */
  debounceMs?: number;
  /** Intervalo de checagem da URL (SPA). */
  routePollMs?: number;
  onReport?: (r: ScanReport) => void;
}

const BLOCK_EVENTS = ['click', 'auxclick', 'mouseup', 'pointerup', 'touchend', 'dblclick'] as const;

export class BlockerEngine {
  readonly doc: Document;
  readonly win: Window;
  private filters: Filters = { ...NO_FILTERS };
  private style: HTMLStyleElement | null = null;
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private overlay: OverlayReason | null = null;
  private notice: string | null = null;
  private observer: MutationObserver | null = null;
  private timer: number | null = null;
  private routeTimer: number | null = null;
  private videoTimer: number | null = null;
  private toastTimer: number | null = null;
  private lastHref = '';
  private lastNonPostRoute: RouteKind = 'other';
  private lastScanAt = 0;
  private started = false;
  private readonly debounceMs: number;
  private readonly routePollMs: number;
  private readonly onReport?: (r: ScanReport) => void;
  errors = 0;
  lastReport: ScanReport | null = null;

  constructor(opts: EngineOptions = {}) {
    this.doc = opts.doc ?? document;
    this.win = opts.win ?? window;
    this.debounceMs = opts.debounceMs ?? 60;
    this.routePollMs = opts.routePollMs ?? 300;
    this.onReport = opts.onReport;
  }

  get active(): boolean {
    return Object.values(this.filters).some(Boolean);
  }

  // ------------------------------------------------------------ ciclo de vida

  start(): void {
    if (this.started) return;
    this.started = true;
    this.ensureStyle();
    for (const type of BLOCK_EVENTS) this.win.addEventListener(type, this.onPointer, true);
    this.win.addEventListener('keydown', this.onKey, true);
    this.win.addEventListener('play', this.onPlay, true);
    this.win.addEventListener('popstate', this.onRouteMaybeChanged);
    const MO = (this.win as unknown as { MutationObserver?: typeof MutationObserver }).MutationObserver ?? MutationObserver;
    const observer = new MO(() => this.schedule());
    observer.observe(this.doc.documentElement, { childList: true, subtree: true });
    this.observer = observer;
    this.routeTimer = this.win.setInterval(this.onRouteMaybeChanged, this.routePollMs);
    this.lastHref = this.win.location.href;
    this.scan();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    for (const type of BLOCK_EVENTS) this.win.removeEventListener(type, this.onPointer, true);
    this.win.removeEventListener('keydown', this.onKey, true);
    this.win.removeEventListener('play', this.onPlay, true);
    this.win.removeEventListener('popstate', this.onRouteMaybeChanged);
    this.observer?.disconnect();
    if (this.timer !== null) this.win.clearTimeout(this.timer);
    if (this.routeTimer !== null) this.win.clearInterval(this.routeTimer);
    this.setVideoGuard(false);
    this.clearMarks();
    this.setOverlay(null);
    this.setNotice(null);
    this.style?.remove();
    this.style = null;
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }

  /** Recebe os filtros efetivos (todos falsos = bloqueador pausado). */
  setFilters(filters: Filters): void {
    const changed = JSON.stringify(filters) !== JSON.stringify(this.filters);
    this.filters = { ...filters };
    if (!changed) return;
    this.ensureStyle();
    this.clearMarks();
    if (this.started) this.scan();
  }

  getFilters(): Filters {
    return { ...this.filters };
  }

  // ------------------------------------------------------------ varredura

  private schedule = (): void => {
    if (this.timer !== null || !this.started) return;
    const wait = Math.max(0, this.debounceMs - (Date.now() - this.lastScanAt));
    this.timer = this.win.setTimeout(() => {
      this.timer = null;
      this.scan();
    }, wait);
  };

  private onRouteMaybeChanged = (): void => {
    const href = this.win.location.href;
    if (href === this.lastHref) return;
    this.lastHref = href;
    this.scan();
  };

  /** Varre a página inteira e aplica as marcações. Idempotente. */
  scan(): ScanReport {
    this.lastScanAt = Date.now();
    const route = classifyPath(this.win.location.pathname);
    const f = this.filters;
    const desired = new Map<Element, Mark>();
    const report: ScanReport = { route, hidden: {}, placeholders: 0, links: 0, overlay: null, errors: 0 };
    const run = (fn: () => void) => {
      try {
        fn();
      } catch (err) {
        report.errors++;
        this.errors++;
        if (typeof console !== 'undefined') console.debug('[Instagram Minimal] detector falhou', err);
      }
    };
    const hide = (el: Element, reason: string) => desired.set(el, { kind: 'hidden', reason });
    const placeholder = (el: Element, text: string, size?: 'tile') => {
      if (!desired.has(el)) desired.set(el, { kind: 'placeholder', text, size });
    };

    if (this.active) {
      const main = this.doc.querySelector(SELECTORS.main) ?? this.doc.body;

      // Feed: sugeridos, patrocinados, Reels e blocos de descoberta.
      if (route === 'feed' && main) {
        run(() => {
          for (const article of Array.from(main.querySelectorAll(SELECTORS.feedArticle))) {
            if (article.closest(SELECTORS.dialog)) continue;
            const kind = classifyFeedArticle(article);
            if (kind === 'sponsored' && f.blockSponsored) hide(article, 'sponsored');
            else if (kind === 'suggested' && f.blockSuggestedPosts) hide(article, 'suggested');
            else if (kind === 'reel' && f.blockShortVideos) placeholder(article, MESSAGES.reelBlocked);
          }
        });
        if (f.blockSuggestedPosts || f.blockShortVideos) {
          run(() => findSuggestedContentBlocks(main).forEach((el) => hide(el, 'discovery')));
        }
      }

      // Reels compartilhados em conversas (página do Direct ou janela flutuante
      // sobre qualquer tela). Vídeos comuns não têm o ícone de Reel e ficam.
      if (f.blockDirectReels) {
        run(() => {
          for (const el of findDirectReelCards(this.doc, { textLinks: route === 'direct' })) {
            if (el.matches('a[href]') && !el.querySelector('img, video')) desired.set(el, { kind: 'link' });
            else placeholder(el, MESSAGES.reelBlocked);
          }
        });
      }

      // Grades: Explorar, hashtags, locais, perfis e "mais publicações".
      const isExplore = route === 'explore' || route === 'explore-other';
      if (isExplore || route === 'profile' || route === 'post') {
        run(() => {
          const scope = main ?? this.doc;
          for (const tile of findGridTiles(scope)) {
            if (tile.el.closest(SELECTORS.dialog)) continue;
            if (isExplore && f.hideExplore) hide(tile.el, 'explore');
            else if (tile.isReel && f.blockShortVideos) placeholder(tile.el, MESSAGES.shortVideoBlocked, 'tile');
          }
        });
      }

      // Links de texto para Reels em qualquer lugar.
      if (f.blockReelLinks) {
        run(() => {
          for (const a of Array.from(this.doc.querySelectorAll(SELECTORS.anchor))) {
            if (desired.has(a) || a.closest(`[${ATTR.placeholder}],[${ATTR.hidden}]`)) continue;
            if (a.querySelector('img, video, svg')) continue; // ícones/blocos têm tratamento próprio
            if (isReelHref(a.getAttribute('href'))) desired.set(a, { kind: 'link' });
          }
        });
      }
    }

    // Rota e diálogos.
    let overlay: OverlayReason | null = null;
    run(() => {
      overlay = this.decideOverlay(route);
    });
    if (route !== 'post') this.lastNonPostRoute = route;

    this.applyMarks(desired, report);
    this.setOverlay(overlay);
    this.setNotice(
      this.active && f.hideExplore && (route === 'explore' || route === 'explore-other') ? MESSAGES.exploreHidden : null,
    );
    report.overlay = overlay;
    this.lastReport = report;
    this.onReport?.(report);
    return report;
  }

  private decideOverlay(route: RouteKind): OverlayReason | null {
    const f = this.filters;
    if (!this.active) return null;
    if (REEL_ROUTES.has(route) && (f.blockReels || f.blockReelLinks)) return 'reel';
    const fromDirect = route === 'direct' || (route === 'post' && this.lastNonPostRoute === 'direct');
    const allowed = f.blockReels || (f.blockDirectReels && fromDirect);
    if (!allowed) return null;
    // Post aberto por cima (diálogo) — é assim que um Reel do Direct abre.
    // Com um diálogo aberto, só ele conta: a página por trás (ex.: a conversa
    // com o cartão do Reel já bloqueado) não diz nada sobre o que está aberto.
    const dialogs = Array.from(this.doc.querySelectorAll(SELECTORS.dialog));
    if (dialogs.length) return dialogs.some((d) => primaryPostShowsReel(d)) ? 'reel' : null;
    // Página /p/CODE/ carregada direto que, na verdade, é um Reel.
    if (route === 'post') {
      const article = this.doc.querySelector(SELECTORS.main)?.querySelector(SELECTORS.feedArticle);
      if (article && primaryPostShowsReel(article)) return 'reel';
    }
    return null;
  }

  private applyMarks(desired: Map<Element, Mark>, report: ScanReport): void {
    const current = this.doc.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}],[${ATTR.link}]`);
    for (const el of Array.from(current)) if (!desired.has(el)) this.unmark(el);
    for (const [el, mark] of desired) {
      if (mark.kind === 'hidden') {
        if (el.getAttribute(ATTR.hidden) !== mark.reason) {
          this.unmark(el);
          el.setAttribute(ATTR.hidden, mark.reason);
        }
        report.hidden[mark.reason] = (report.hidden[mark.reason] ?? 0) + 1;
      } else if (mark.kind === 'placeholder') {
        if (el.getAttribute(ATTR.placeholder) !== mark.text) {
          this.unmark(el);
          el.setAttribute(ATTR.placeholder, mark.text);
          const aria = el.getAttribute('aria-label');
          if (aria !== null) el.setAttribute('data-im-aria', aria);
          el.setAttribute('aria-label', mark.text);
          if (mark.size) el.setAttribute('data-im-size', mark.size);
        }
        this.pauseVideosIn(el);
        report.placeholders++;
      } else {
        if (!el.hasAttribute(ATTR.link)) {
          this.unmark(el);
          el.setAttribute(ATTR.link, 'blocked');
        }
        report.links++;
      }
    }
  }

  private unmark(el: Element): void {
    if (el.hasAttribute(ATTR.placeholder)) {
      const original = el.getAttribute('data-im-aria');
      if (original !== null) el.setAttribute('aria-label', original);
      else el.removeAttribute('aria-label');
    }
    el.removeAttribute(ATTR.hidden);
    el.removeAttribute(ATTR.placeholder);
    el.removeAttribute(ATTR.link);
    el.removeAttribute('data-im-size');
    el.removeAttribute('data-im-aria');
  }

  private clearMarks(): void {
    for (const el of Array.from(this.doc.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}],[${ATTR.link}]`))) {
      this.unmark(el);
    }
  }

  // ------------------------------------------------------------ eventos

  /** Bloqueia cliques em cartões bloqueados e em links de Reels. */
  private onPointer = (e: Event): void => {
    if (!this.active) return;
    const target = e.target as Element | null;
    if (!target || typeof (target as Element).closest !== 'function') return;
    if (this.host && (target === this.host || this.host.contains(target))) return;
    const blockedCard = target.closest(`[${ATTR.placeholder}],[${ATTR.link}]`);
    let block = blockedCard !== null;
    if (!block && this.filters.blockReelLinks) {
      const a = target.closest('a[href]');
      if (a && isReelHref(a.getAttribute('href'))) block = true;
    }
    if (!block) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === 'click' || e.type === 'auxclick') this.toast(MESSAGES.blocked);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (!this.active || (e.key !== 'Enter' && e.key !== ' ')) return;
    const target = e.target as Element | null;
    if (!target?.closest) return;
    const a = target.closest('a[href]');
    if (
      target.closest(`[${ATTR.placeholder}],[${ATTR.link}]`) ||
      (this.filters.blockReelLinks && a && isReelHref(a.getAttribute('href')))
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.toast(MESSAGES.blocked);
    }
  };

  /** Nenhum vídeo bloqueado toca, nem por autoplay. */
  private onPlay = (e: Event): void => {
    if (!this.active) return;
    const v = e.target as HTMLVideoElement | null;
    if (!v || v.tagName !== 'VIDEO') return;
    if (this.overlay || v.closest(`[${ATTR.placeholder}],[${ATTR.hidden}]`)) {
      try {
        v.muted = true;
        v.pause();
      } catch {
        /* ignore */
      }
    }
  };

  private pauseVideosIn(root: ParentNode): void {
    for (const v of Array.from(root.querySelectorAll('video'))) {
      try {
        v.muted = true;
        if (!v.paused) v.pause();
      } catch {
        /* ignore */
      }
    }
  }

  private setVideoGuard(on: boolean): void {
    if (on && this.videoTimer === null) {
      this.pauseVideosIn(this.doc);
      this.videoTimer = this.win.setInterval(() => this.pauseVideosIn(this.doc), 250);
    } else if (!on && this.videoTimer !== null) {
      this.win.clearInterval(this.videoTimer);
      this.videoTimer = null;
    }
  }

  // ------------------------------------------------------------ UI própria

  private ensureStyle(): void {
    if (!this.style || !this.style.isConnected) {
      this.style = this.doc.createElement('style');
      this.style.id = 'instagram-minimal-style';
      (this.doc.head ?? this.doc.documentElement).appendChild(this.style);
    }
    const css = buildStyles(this.filters);
    if (this.style.textContent !== css) this.style.textContent = css;
  }

  private ensureHost(): ShadowRoot {
    if (this.shadow && this.host?.isConnected) return this.shadow;
    this.host = this.doc.createElement('div');
    this.host.id = 'instagram-minimal-ui';
    this.doc.documentElement.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: 'open' });
    const style = this.doc.createElement('style');
    style.textContent = OVERLAY_CSS;
    this.shadow.appendChild(style);
    return this.shadow;
  }

  getOverlay(): OverlayReason | null {
    return this.overlay;
  }

  private setOverlay(reason: OverlayReason | null): void {
    if (reason === this.overlay) return;
    this.overlay = reason;
    this.setVideoGuard(reason !== null);
    const existing = this.shadow?.querySelector('.wrap');
    existing?.remove();
    if (!reason) return;
    const root = this.ensureHost();
    const wrap = this.doc.createElement('div');
    wrap.className = 'wrap';
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'im-title');
    wrap.innerHTML = `<div class="card"><div class="mark" aria-hidden="true"></div>
      <h1 id="im-title"></h1><p></p><button type="button"></button></div>`;
    wrap.querySelector('h1')!.textContent = MESSAGES.blocked;
    wrap.querySelector('p')!.textContent = 'Reels e vídeos curtos ficam de fora. Mensagens, Stories e posts de quem você segue continuam normais.';
    const btn = wrap.querySelector('button')!;
    btn.textContent = 'Voltar';
    btn.addEventListener('click', () => this.goBack());
    root.appendChild(wrap);
    try {
      btn.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  private goBack(): void {
    // Diálogo aberto (ex.: Reel vindo do Direct): fechar o diálogo devolve à
    // tela de onde ele veio. Testado no site real em 26/nov/2026: Esc e o
    // botão "Close" do diálogo funcionam; history.back() pode pular a conversa.
    if (this.doc.querySelector(SELECTORS.dialog)) {
      const esc = () => new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true });
      this.doc.body?.dispatchEvent(esc());
      this.doc.dispatchEvent(esc());
      this.win.setTimeout(() => {
        const dialog = this.doc.querySelector(SELECTORS.dialog);
        if (!dialog) return;
        const close = Array.from(dialog.querySelectorAll(SELECTORS.labeledSvg))
          .find((s) => matchesLabel('close', s.getAttribute('aria-label')))
          ?.closest(SELECTORS.button) as HTMLElement | null | undefined;
        if (close) close.click();
        else this.historyBack();
      }, 350);
      return;
    }
    this.historyBack();
  }

  private historyBack(): void {
    const before = this.win.location.href;
    if (this.win.history.length > 1) this.win.history.back();
    // Se não havia para onde voltar (link aberto em aba nova), vai ao feed.
    this.win.setTimeout(() => {
      if (this.win.location.href === before) this.win.location.assign('/');
    }, 400);
  }

  private setNotice(text: string | null): void {
    if (text === this.notice) return;
    this.notice = text;
    this.shadow?.querySelector('.toast.soft')?.remove();
    if (!text) return;
    const el = this.doc.createElement('div');
    el.className = 'toast soft';
    el.setAttribute('role', 'status');
    el.textContent = text;
    this.ensureHost().appendChild(el);
  }

  toast(text: string): void {
    const root = this.ensureHost();
    root.querySelector('.toast:not(.soft)')?.remove();
    if (this.toastTimer !== null) this.win.clearTimeout(this.toastTimer);
    const el = this.doc.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = text;
    root.appendChild(el);
    this.toastTimer = this.win.setTimeout(() => el.remove(), 2600);
  }
}
