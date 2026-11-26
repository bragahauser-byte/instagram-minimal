// ==UserScript==
// @name         Instagram Minimal
// @namespace    https://bragahauser-byte.github.io/instagram-minimal/
// @version      1.2.0
// @description  Instagram sem Reels, sem vídeos curtos e sem publicações sugeridas. Direct, Stories e quem você segue continuam iguais.
// @author       Instagram Minimal contributors
// @homepageURL  https://bragahauser-byte.github.io/instagram-minimal/
// @supportURL   https://github.com/bragahauser-byte/instagram-minimal/issues
// @updateURL    https://bragahauser-byte.github.io/instagram-minimal/instagram-minimal.user.js
// @downloadURL  https://bragahauser-byte.github.io/instagram-minimal/instagram-minimal.user.js
// @icon         https://bragahauser-byte.github.io/instagram-minimal/apple-touch-icon.png
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @match        https://bragahauser-byte.github.io/instagram-minimal/*
// @run-at       document-start
// @noframes
// @grant        none
// @license      MIT
// ==/UserScript==

"use strict";
(() => {
  // packages/core/src/settings.ts
  var DEFAULT_FILTERS = Object.freeze({
    blockReels: !0,
    blockDirectReels: !0,
    blockSuggestedPosts: !0,
    blockShortVideos: !0,
    blockSponsored: !0,
    hideExplore: !0,
    blockReelLinks: !0
  }), NO_FILTERS = Object.freeze({
    blockReels: !1,
    blockDirectReels: !1,
    blockSuggestedPosts: !1,
    blockShortVideos: !1,
    blockSponsored: !1,
    hideExplore: !1,
    blockReelLinks: !1
  });

  // packages/core/src/modes.ts
  var FOCUS_UNLOCK_WINDOW_MS = 5 * 6e4;

  // packages/filters/src/urls.ts
  var RESERVED = /* @__PURE__ */ new Set([
    "explore",
    "direct",
    "stories",
    "accounts",
    "p",
    "reel",
    "reels",
    "tv",
    "about",
    "legal",
    "developer",
    "challenge",
    "emails",
    "oauth",
    "web",
    "api",
    "graphql",
    "ajax",
    "static",
    "session",
    "privacy",
    "terms",
    "help",
    "press",
    "business",
    "create",
    "your_activity",
    "notifications",
    "invites",
    "meta-verified",
    "lite",
    "locations",
    "topics",
    "threads"
  ]), IG_HOST = /^(www\.|m\.)?instagram\.com$/i, REEL_ROUTES = /* @__PURE__ */ new Set(["reel", "reels-tab", "reels-audio", "profile-reels"]);
  function splitPath(pathname) {
    return pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  }
  function classifyPath(pathname) {
    let seg = splitPath(pathname).map((s) => s.toLowerCase()), [a, b, c] = seg;
    return a ? a === "reel" ? b ? "reel" : "reels-tab" : a === "reels" ? b ? b === "audio" ? "reels-audio" : "reel" : "reels-tab" : a === "explore" ? b ? b === "people" ? "explore-people" : "explore-other" : "explore" : a === "direct" ? "direct" : a === "stories" ? "stories" : a === "p" || a === "tv" ? b ? "post" : "other" : RESERVED.has(a) ? "other" : b ? b === "reel" && c ? "reel" : b === "reels" ? "profile-reels" : (b === "p" || b === "tv") && c ? "post" : "profile" : "profile" : "feed";
  }
  function isReelRoute(pathname) {
    return REEL_ROUTES.has(classifyPath(pathname));
  }
  function instagramPath(href, base = "https://www.instagram.com/") {
    if (!href) return null;
    let h = href.trim();
    if (!h || h.startsWith("#") || /^(javascript|mailto|tel):/i.test(h)) return null;
    try {
      let u = new URL(h, base);
      return IG_HOST.test(u.hostname) ? u.pathname : null;
    } catch {
      return null;
    }
  }
  function isReelHref(href, base) {
    let path = instagramPath(href, base);
    return path !== null && isReelRoute(path);
  }
  function isSpecificReelHref(href, base) {
    let path = instagramPath(href, base);
    return path !== null && classifyPath(path) === "reel";
  }
  function isReelAudioHref(href, base) {
    let path = instagramPath(href, base);
    return path !== null && classifyPath(path) === "reels-audio";
  }
  function isPostOrReelHref(href, base) {
    let path = instagramPath(href, base);
    if (path === null) return !1;
    let kind = classifyPath(path);
    return kind === "post" || kind === "reel";
  }

  // packages/filters/src/selectors.ts
  var LABELS = {
    /** aria-label do ícone que marca Reels/clipes em cartões e grades. */
    reelIcon: ["Reel", "Reels", "Clip", "Clips", "Clipe", "Clipes", "V\xEDdeo do Reels"],
    /** Ícone de busca: o item /explore/ com este ícone é a busca (celular) e nunca é escondido. */
    searchIcon: ["Search", "Pesquisar", "Pesquisa", "Buscar", "Busca", "Search and explore"],
    /** Rótulo de publicação sugerida no cabeçalho do post. */
    suggested: [
      "Suggested for you",
      "Suggested post",
      "Suggested posts",
      "Suggested",
      "Sugest\xF5es para voc\xEA",
      "Sugerido para voc\xEA",
      "Sugest\xE3o para voc\xEA",
      "Sugerida para voc\xEA",
      "Publica\xE7\xE3o sugerida",
      "Publica\xE7\xF5es sugeridas",
      "Recomendado para voc\xEA",
      "Sugerencias para ti",
      "Sugerido para ti",
      "Publicaci\xF3n sugerida"
    ],
    /** Rótulo de anúncio. "Paid partnership" NÃO entra: é parceria de conta seguida. */
    sponsored: ["Sponsored", "Ad", "Patrocinado", "Patrocinada", "An\xFAncio", "Publicidade", "Publicidad"],
    /** Botão "Seguir" num post do feed = conta que você não segue. */
    follow: ["Follow", "Seguir", "Follow back", "Seguir de volta", "Seguir tambi\xE9n"],
    /** Botão de fechar diálogos (usado pelo "Voltar" da tela de bloqueio). */
    close: ["Close", "Fechar", "Cerrar"],
    /** Cabeçalhos de blocos de descoberta de conteúdo dentro do feed. */
    suggestedContentHeadings: [
      "Suggested posts",
      "Suggested reels",
      "Suggested for you reels",
      "Reels for you",
      "Publica\xE7\xF5es sugeridas",
      "Reels sugeridos",
      "Sugest\xF5es de reels",
      "Reels para voc\xEA",
      "Publicaciones sugeridas",
      "Reels sugeridos para ti"
    ]
  }, SELECTORS = {
    /** Links de navegação para a aba Reels e para a aba Reels de um perfil. */
    reelsNavLinks: 'a[href="/reels/"], a[href$="/reels/"]',
    /** Link da seção Explorar (desktop: item "Explore"; celular: pode ser a busca). */
    exploreNavLink: 'a[href="/explore/"]',
    feedArticle: "article",
    dialog: '[role="dialog"]',
    /** Bolha de mensagem no Direct (e na janela flutuante de conversa). */
    message: '[role="article"]',
    main: 'main, [role="main"]',
    labeledSvg: "svg[aria-label]",
    button: 'button, [role="button"]',
    anchor: "a[href]",
    adLink: 'a[href*="facebook.com/ads/"], a[href*="/ads/ig_redirect"]',
    video: "video",
    media: "img, video"
  }, norm = (t) => (t ?? "").replace(/\s+/g, " ").trim(), lower = (list) => new Set(list.map((s) => s.toLowerCase())), LABEL_SETS = {
    reelIcon: lower(LABELS.reelIcon),
    searchIcon: lower(LABELS.searchIcon),
    suggested: lower(LABELS.suggested),
    sponsored: lower(LABELS.sponsored),
    follow: lower(LABELS.follow),
    close: lower(LABELS.close),
    suggestedContentHeadings: lower(LABELS.suggestedContentHeadings)
  };
  function matchesLabel(group, text) {
    return LABEL_SETS[group].has(norm(text).toLowerCase());
  }
  function leafTexts(root, max = 400) {
    let out = [], walker = root.ownerDocument.createTreeWalker(
      root,
      1
      /* SHOW_ELEMENT */
    ), n = walker.currentNode;
    for (; n && out.length < max; ) {
      let el = n;
      if (el.childElementCount === 0) {
        let t = norm(el.textContent);
        t && t.length <= 60 && out.push(t);
      }
      n = walker.nextNode();
    }
    return out;
  }
  function hasLeafLabel(root, group) {
    return leafTexts(root).some((t) => matchesLabel(group, t));
  }
  function svgLabels(root) {
    return Array.from(root.querySelectorAll(SELECTORS.labeledSvg), (s) => s.getAttribute("aria-label") ?? "");
  }
  function hasReelIcon(root) {
    return svgLabels(root).some((l) => matchesLabel("reelIcon", l));
  }

  // packages/filters/src/classify.ts
  var hrefs = (root) => Array.from(root.querySelectorAll(SELECTORS.anchor), (a) => a.getAttribute("href"));
  function reelSignals(root, opts = {}) {
    let isTile = (el) => opts.ignoreTiles === !0 && el.closest("a[href]")?.querySelector("img, video") != null, hs = Array.from(root.querySelectorAll(SELECTORS.anchor)).filter((a) => !isTile(a)).map((a) => a.getAttribute("href")), icon = Array.from(root.querySelectorAll(SELECTORS.labeledSvg)).some(
      (s) => matchesLabel("reelIcon", s.getAttribute("aria-label")) && !isTile(s)
    );
    return {
      strong: hs.some((h) => isSpecificReelHref(h)) || icon,
      audio: hs.some((h) => isReelAudioHref(h)),
      video: root.querySelector(SELECTORS.video) !== null
    };
  }
  function containsReel(root, opts = {}) {
    let s = reelSignals(root, opts);
    return s.strong || s.audio && s.video;
  }
  function isPostArticle(article) {
    return hrefs(article).some((h) => isPostOrReelHref(h)) ? !0 : article.querySelector(SELECTORS.video) !== null;
  }
  function hasFollowButton(article) {
    return Array.from(article.querySelectorAll(SELECTORS.button)).some(
      (b) => (
        // Botões com texto curto e exato: "Follow"/"Seguir".
        matchesLabel("follow", b.textContent)
      )
    );
  }
  function classifyFeedArticle(article) {
    let isAd = article.querySelector(SELECTORS.adLink) !== null || hasLeafLabel(article, "sponsored");
    return !isPostArticle(article) && !isAd ? "not-a-post" : isAd ? "sponsored" : hasLeafLabel(article, "suggested") || hasFollowButton(article) ? "suggested" : containsReel(article) ? "reel" : "post";
  }
  function findDirectReelCards(root, opts = {}) {
    let out = /* @__PURE__ */ new Set();
    for (let svg of Array.from(root.querySelectorAll(SELECTORS.labeledSvg))) {
      if (!matchesLabel("reelIcon", svg.getAttribute("aria-label"))) continue;
      let card = svg.closest(SELECTORS.button) ?? svg.closest("a[href]");
      !card || !card.closest(SELECTORS.message) || card.querySelector(`textarea, [contenteditable="true"], ${SELECTORS.message}`) || out.add(card);
    }
    for (let a of Array.from(root.querySelectorAll(SELECTORS.anchor)))
      isSpecificReelHref(a.getAttribute("href")) && (opts.textLinks || a.closest(SELECTORS.message)) && out.add(a);
    return [...out].filter((el) => ![...out].some((other) => other !== el && other.contains(el)));
  }
  function findGridTiles(root) {
    let tiles = [];
    for (let a of Array.from(root.querySelectorAll(SELECTORS.anchor))) {
      let href = a.getAttribute("href");
      isPostOrReelHref(href) && a.querySelector("img, video") && tiles.push({ el: a, isReel: isSpecificReelHref(href) || hasReelIcon(a) });
    }
    return tiles;
  }
  function closestFeedItem(el, stopAt) {
    let cur = el;
    for (let depth = 0; cur && cur.parentElement && depth < 12; depth++) {
      let parent = cur.parentElement;
      if (parent === stopAt || parent.tagName === "BODY" || parent.tagName === "MAIN" || Array.from(parent.children).filter((c) => c !== cur).some((s) => s.tagName === "ARTICLE" || s.querySelector(":scope > article, :scope > div > article")))
        return cur;
      cur = parent;
    }
    return null;
  }
  function findSuggestedContentBlocks(root) {
    let out = /* @__PURE__ */ new Set(), walker = root.ownerDocument.createTreeWalker(root, 1), n = walker.nextNode();
    for (; n; ) {
      let el = n;
      if (el.childElementCount === 0 && matchesLabel("suggestedContentHeadings", el.textContent)) {
        let item = closestFeedItem(el, root);
        item && item.tagName !== "ARTICLE" && hrefs(item).some((h) => isPostOrReelHref(h)) && out.add(item);
      }
      n = walker.nextNode();
    }
    return [...out];
  }
  function primaryPostShowsReel(container) {
    let article = container.matches("article") ? container : container.querySelector("article");
    return containsReel(article ?? container, { ignoreTiles: !0 });
  }

  // packages/filters/src/styles.ts
  var ATTR = {
    hidden: "data-im-hidden",
    placeholder: "data-im-placeholder",
    link: "data-im-link"
  }, MESSAGES = {
    blocked: "Este conte\xFAdo foi bloqueado pelo Instagram Minimal.",
    reelBlocked: "Reel bloqueado.",
    shortVideoBlocked: "V\xEDdeo curto bloqueado.",
    exploreHidden: "Explorar est\xE1 oculto pelo Instagram Minimal. A pesquisa continua dispon\xEDvel."
  }, FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  function buildStyles(f) {
    let rules = [
      `[${ATTR.hidden}]{display:none!important}`,
      `[${ATTR.placeholder}]{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:64px!important;box-sizing:border-box!important;padding:12px 16px!important;border-radius:14px!important;background:rgba(134,134,139,.12)!important;cursor:default!important;overflow:hidden!important;text-decoration:none!important}`,
      `[${ATTR.placeholder}]>*{display:none!important}`,
      `[${ATTR.placeholder}]::after{content:attr(${ATTR.placeholder});font:500 13px/1.3 ${FONT};color:#86868B;letter-spacing:-.01em;text-align:center}`,
      `[${ATTR.placeholder}][data-im-size="tile"]{min-height:0!important;height:100%!important;width:100%!important;aspect-ratio:3/4;border-radius:4px!important}`,
      `[${ATTR.link}]{opacity:.55!important;text-decoration:line-through!important;cursor:not-allowed!important}`
    ];
    if (f.blockReels && rules.push(`${SELECTORS.reelsNavLinks}{display:none!important}`), f.hideExplore) {
      let notSearch = LABELS.searchIcon.map((l) => `:not(:has(svg[aria-label="${l}"]))`).join("");
      rules.push(`${SELECTORS.exploreNavLink}${notSearch}{display:none!important}`);
    }
    return rules.join(`
`);
  }
  var OVERLAY_CSS = `
:host{all:initial}
.wrap{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
  background:#FFFFFF;
  font-family:${FONT};color:#1C1C1E;animation:in .18s ease-out}
.card{max-width:340px;padding:32px 28px;text-align:center}
.mark{width:44px;height:44px;margin:0 auto 20px;border-radius:12px;background:#1C1C1E;position:relative}
.mark::after{content:"";position:absolute;left:10px;top:20px;width:17px;height:4px;border-radius:2px;background:#fff}
.mark::before{content:"";position:absolute;width:5px;height:5px;left:30px;top:19.5px;border-radius:50%;background:#007AFF}
h1{font-size:19px;line-height:1.3;font-weight:600;letter-spacing:-.02em;margin:0 0 8px}
p{font-size:14px;line-height:1.45;color:#86868B;margin:0 0 24px}
button{font:inherit;font-size:15px;font-weight:500;border:0;border-radius:980px;padding:11px 22px;cursor:pointer;
  background:#007AFF;color:#fff;transition:transform .12s ease,opacity .12s ease}
button:active{transform:scale(.97);opacity:.85}
button:focus-visible{outline:3px solid rgba(0,122,255,.4);outline-offset:2px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;max-width:min(92vw,420px);
  padding:12px 18px;border-radius:14px;background:rgba(28,28,30,.92);color:#fff;font:500 13px/1.35 ${FONT};
  text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.18);animation:up .2s ease-out;pointer-events:none}
.toast.soft{background:rgba(245,245,247,.96);color:#1C1C1E;box-shadow:0 4px 20px rgba(0,0,0,.08)}
@media (prefers-color-scheme:dark){
  .wrap{background:#000000;color:#F5F5F7}
  .mark{background:#F5F5F7}.mark::after{background:#1C1C1E}
  .toast.soft{background:rgba(44,44,46,.96);color:#F5F5F7}
}
@media (prefers-reduced-motion:reduce){.wrap,.toast{animation:none}}
@keyframes in{from{opacity:0}to{opacity:1}}
@keyframes up{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
`;

  // packages/filters/src/engine.ts
  var BLOCK_EVENTS = ["click", "auxclick", "mouseup", "pointerup", "touchend", "dblclick"], BlockerEngine = class {
    doc;
    win;
    filters = { ...NO_FILTERS };
    style = null;
    host = null;
    shadow = null;
    overlay = null;
    notice = null;
    observer = null;
    timer = null;
    routeTimer = null;
    videoTimer = null;
    toastTimer = null;
    lastHref = "";
    lastNonPostRoute = "other";
    lastScanAt = 0;
    started = !1;
    debounceMs;
    routePollMs;
    onReport;
    errors = 0;
    lastReport = null;
    constructor(opts = {}) {
      this.doc = opts.doc ?? document, this.win = opts.win ?? window, this.debounceMs = opts.debounceMs ?? 60, this.routePollMs = opts.routePollMs ?? 300, this.onReport = opts.onReport;
    }
    get active() {
      return Object.values(this.filters).some(Boolean);
    }
    // ------------------------------------------------------------ ciclo de vida
    start() {
      if (this.started) return;
      this.started = !0, this.ensureStyle();
      for (let type of BLOCK_EVENTS) this.win.addEventListener(type, this.onPointer, !0);
      this.win.addEventListener("keydown", this.onKey, !0), this.win.addEventListener("play", this.onPlay, !0), this.win.addEventListener("popstate", this.onRouteMaybeChanged);
      let MO = this.win.MutationObserver ?? MutationObserver, observer = new MO(() => this.schedule());
      observer.observe(this.doc.documentElement, { childList: !0, subtree: !0 }), this.observer = observer, this.routeTimer = this.win.setInterval(this.onRouteMaybeChanged, this.routePollMs), this.lastHref = this.win.location.href, this.scan();
    }
    stop() {
      if (this.started) {
        this.started = !1;
        for (let type of BLOCK_EVENTS) this.win.removeEventListener(type, this.onPointer, !0);
        this.win.removeEventListener("keydown", this.onKey, !0), this.win.removeEventListener("play", this.onPlay, !0), this.win.removeEventListener("popstate", this.onRouteMaybeChanged), this.observer?.disconnect(), this.timer !== null && this.win.clearTimeout(this.timer), this.routeTimer !== null && this.win.clearInterval(this.routeTimer), this.setVideoGuard(!1), this.clearMarks(), this.setOverlay(null), this.setNotice(null), this.style?.remove(), this.style = null, this.host?.remove(), this.host = null, this.shadow = null;
      }
    }
    /** Recebe os filtros efetivos (todos falsos = bloqueador pausado). */
    setFilters(filters) {
      let changed = JSON.stringify(filters) !== JSON.stringify(this.filters);
      this.filters = { ...filters }, changed && (this.ensureStyle(), this.clearMarks(), this.started && this.scan());
    }
    getFilters() {
      return { ...this.filters };
    }
    // ------------------------------------------------------------ varredura
    schedule = () => {
      if (this.timer !== null || !this.started) return;
      let wait = Math.max(0, this.debounceMs - (Date.now() - this.lastScanAt));
      this.timer = this.win.setTimeout(() => {
        this.timer = null, this.scan();
      }, wait);
    };
    onRouteMaybeChanged = () => {
      let href = this.win.location.href;
      href !== this.lastHref && (this.lastHref = href, this.scan());
    };
    /** Varre a página inteira e aplica as marcações. Idempotente. */
    scan() {
      this.lastScanAt = Date.now();
      let route = classifyPath(this.win.location.pathname), f = this.filters, desired = /* @__PURE__ */ new Map(), report = { route, hidden: {}, placeholders: 0, links: 0, overlay: null, errors: 0 }, run = (fn) => {
        try {
          fn();
        } catch (err) {
          report.errors++, this.errors++, typeof console < "u" && console.debug("[Instagram Minimal] detector falhou", err);
        }
      }, hide = (el, reason) => desired.set(el, { kind: "hidden", reason }), placeholder = (el, text, size) => {
        desired.has(el) || desired.set(el, { kind: "placeholder", text, size });
      };
      if (this.active) {
        let main = this.doc.querySelector(SELECTORS.main) ?? this.doc.body;
        route === "feed" && main && (run(() => {
          for (let article of Array.from(main.querySelectorAll(SELECTORS.feedArticle))) {
            if (article.closest(SELECTORS.dialog)) continue;
            let kind = classifyFeedArticle(article);
            kind === "sponsored" && f.blockSponsored ? hide(article, "sponsored") : kind === "suggested" && f.blockSuggestedPosts ? hide(article, "suggested") : kind === "reel" && f.blockShortVideos && placeholder(article, MESSAGES.reelBlocked);
          }
        }), (f.blockSuggestedPosts || f.blockShortVideos) && run(() => findSuggestedContentBlocks(main).forEach((el) => hide(el, "discovery")))), f.blockDirectReels && run(() => {
          for (let el of findDirectReelCards(this.doc, { textLinks: route === "direct" }))
            el.matches("a[href]") && !el.querySelector("img, video") ? desired.set(el, { kind: "link" }) : placeholder(el, MESSAGES.reelBlocked);
        });
        let isExplore = route === "explore" || route === "explore-other";
        (isExplore || route === "profile" || route === "post") && run(() => {
          let scope = main ?? this.doc;
          for (let tile of findGridTiles(scope))
            tile.el.closest(SELECTORS.dialog) || (isExplore && f.hideExplore ? hide(tile.el, "explore") : tile.isReel && f.blockShortVideos && placeholder(tile.el, MESSAGES.shortVideoBlocked, "tile"));
        }), f.blockReelLinks && run(() => {
          for (let a of Array.from(this.doc.querySelectorAll(SELECTORS.anchor)))
            desired.has(a) || a.closest(`[${ATTR.placeholder}],[${ATTR.hidden}]`) || a.querySelector("img, video, svg") || isReelHref(a.getAttribute("href")) && desired.set(a, { kind: "link" });
        });
      }
      let overlay = null;
      return run(() => {
        overlay = this.decideOverlay(route);
      }), route !== "post" && (this.lastNonPostRoute = route), this.applyMarks(desired, report), this.setOverlay(overlay), this.setNotice(
        this.active && f.hideExplore && (route === "explore" || route === "explore-other") ? MESSAGES.exploreHidden : null
      ), report.overlay = overlay, this.lastReport = report, this.onReport?.(report), report;
    }
    decideOverlay(route) {
      let f = this.filters;
      if (!this.active) return null;
      if (REEL_ROUTES.has(route) && (f.blockReels || f.blockReelLinks)) return "reel";
      let fromDirect = route === "direct" || route === "post" && this.lastNonPostRoute === "direct";
      if (!(f.blockReels || f.blockDirectReels && fromDirect)) return null;
      let dialogs = Array.from(this.doc.querySelectorAll(SELECTORS.dialog));
      if (dialogs.length) return dialogs.some((d) => primaryPostShowsReel(d)) ? "reel" : null;
      if (route === "post") {
        let article = this.doc.querySelector(SELECTORS.main)?.querySelector(SELECTORS.feedArticle);
        if (article && primaryPostShowsReel(article)) return "reel";
      }
      return null;
    }
    applyMarks(desired, report) {
      let current = this.doc.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}],[${ATTR.link}]`);
      for (let el of Array.from(current)) desired.has(el) || this.unmark(el);
      for (let [el, mark] of desired)
        if (mark.kind === "hidden")
          el.getAttribute(ATTR.hidden) !== mark.reason && (this.unmark(el), el.setAttribute(ATTR.hidden, mark.reason)), report.hidden[mark.reason] = (report.hidden[mark.reason] ?? 0) + 1;
        else if (mark.kind === "placeholder") {
          if (el.getAttribute(ATTR.placeholder) !== mark.text) {
            this.unmark(el), el.setAttribute(ATTR.placeholder, mark.text);
            let aria = el.getAttribute("aria-label");
            aria !== null && el.setAttribute("data-im-aria", aria), el.setAttribute("aria-label", mark.text), mark.size && el.setAttribute("data-im-size", mark.size);
          }
          this.pauseVideosIn(el), report.placeholders++;
        } else
          el.hasAttribute(ATTR.link) || (this.unmark(el), el.setAttribute(ATTR.link, "blocked")), report.links++;
    }
    unmark(el) {
      if (el.hasAttribute(ATTR.placeholder)) {
        let original = el.getAttribute("data-im-aria");
        original !== null ? el.setAttribute("aria-label", original) : el.removeAttribute("aria-label");
      }
      el.removeAttribute(ATTR.hidden), el.removeAttribute(ATTR.placeholder), el.removeAttribute(ATTR.link), el.removeAttribute("data-im-size"), el.removeAttribute("data-im-aria");
    }
    clearMarks() {
      for (let el of Array.from(this.doc.querySelectorAll(`[${ATTR.hidden}],[${ATTR.placeholder}],[${ATTR.link}]`)))
        this.unmark(el);
    }
    // ------------------------------------------------------------ eventos
    /** Bloqueia cliques em cartões bloqueados e em links de Reels. */
    onPointer = (e) => {
      if (!this.active) return;
      let target = e.target;
      if (!target || typeof target.closest != "function" || this.host && (target === this.host || this.host.contains(target))) return;
      let block = target.closest(`[${ATTR.placeholder}],[${ATTR.link}]`) !== null;
      if (!block && this.filters.blockReelLinks) {
        let a = target.closest("a[href]");
        a && isReelHref(a.getAttribute("href")) && (block = !0);
      }
      block && (e.preventDefault(), e.stopImmediatePropagation(), (e.type === "click" || e.type === "auxclick") && this.toast(MESSAGES.blocked));
    };
    onKey = (e) => {
      if (!this.active || e.key !== "Enter" && e.key !== " ") return;
      let target = e.target;
      if (!target?.closest) return;
      let a = target.closest("a[href]");
      (target.closest(`[${ATTR.placeholder}],[${ATTR.link}]`) || this.filters.blockReelLinks && a && isReelHref(a.getAttribute("href"))) && (e.preventDefault(), e.stopImmediatePropagation(), this.toast(MESSAGES.blocked));
    };
    /** Nenhum vídeo bloqueado toca, nem por autoplay. */
    onPlay = (e) => {
      if (!this.active) return;
      let v = e.target;
      if (!(!v || v.tagName !== "VIDEO") && (this.overlay || v.closest(`[${ATTR.placeholder}],[${ATTR.hidden}]`)))
        try {
          v.muted = !0, v.pause();
        } catch {
        }
    };
    pauseVideosIn(root) {
      for (let v of Array.from(root.querySelectorAll("video")))
        try {
          v.muted = !0, v.paused || v.pause();
        } catch {
        }
    }
    setVideoGuard(on) {
      on && this.videoTimer === null ? (this.pauseVideosIn(this.doc), this.videoTimer = this.win.setInterval(() => this.pauseVideosIn(this.doc), 250)) : !on && this.videoTimer !== null && (this.win.clearInterval(this.videoTimer), this.videoTimer = null);
    }
    // ------------------------------------------------------------ UI própria
    ensureStyle() {
      (!this.style || !this.style.isConnected) && (this.style = this.doc.createElement("style"), this.style.id = "instagram-minimal-style", (this.doc.head ?? this.doc.documentElement).appendChild(this.style));
      let css = buildStyles(this.filters);
      this.style.textContent !== css && (this.style.textContent = css);
    }
    ensureHost() {
      if (this.shadow && this.host?.isConnected) return this.shadow;
      this.host = this.doc.createElement("div"), this.host.id = "instagram-minimal-ui", this.doc.documentElement.appendChild(this.host), this.shadow = this.host.attachShadow({ mode: "open" });
      let style = this.doc.createElement("style");
      return style.textContent = OVERLAY_CSS, this.shadow.appendChild(style), this.shadow;
    }
    getOverlay() {
      return this.overlay;
    }
    setOverlay(reason) {
      if (reason === this.overlay || (this.overlay = reason, this.setVideoGuard(reason !== null), this.shadow?.querySelector(".wrap")?.remove(), !reason)) return;
      let root = this.ensureHost(), wrap = this.doc.createElement("div");
      wrap.className = "wrap", wrap.setAttribute("role", "alertdialog"), wrap.setAttribute("aria-modal", "true"), wrap.setAttribute("aria-labelledby", "im-title"), wrap.innerHTML = `<div class="card"><div class="mark" aria-hidden="true"></div>
      <h1 id="im-title"></h1><p></p><button type="button"></button></div>`, wrap.querySelector("h1").textContent = MESSAGES.blocked, wrap.querySelector("p").textContent = "Reels e v\xEDdeos curtos ficam de fora. Mensagens, Stories e posts de quem voc\xEA segue continuam normais.";
      let btn = wrap.querySelector("button");
      btn.textContent = "Voltar", btn.addEventListener("click", () => this.goBack()), root.appendChild(wrap);
      try {
        btn.focus({ preventScroll: !0 });
      } catch {
      }
    }
    goBack() {
      if (this.doc.querySelector(SELECTORS.dialog)) {
        let esc = () => new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: !0, cancelable: !0 });
        this.doc.body?.dispatchEvent(esc()), this.doc.dispatchEvent(esc()), this.win.setTimeout(() => {
          let dialog = this.doc.querySelector(SELECTORS.dialog);
          if (!dialog) return;
          let close = Array.from(dialog.querySelectorAll(SELECTORS.labeledSvg)).find((s) => matchesLabel("close", s.getAttribute("aria-label")))?.closest(SELECTORS.button);
          close ? close.click() : this.historyBack();
        }, 350);
        return;
      }
      this.historyBack();
    }
    historyBack() {
      let before = this.win.location.href;
      this.win.history.length > 1 && this.win.history.back(), this.win.setTimeout(() => {
        this.win.location.href === before && this.win.location.assign("/");
      }, 400);
    }
    setNotice(text) {
      if (text === this.notice || (this.notice = text, this.shadow?.querySelector(".toast.soft")?.remove(), !text)) return;
      let el = this.doc.createElement("div");
      el.className = "toast soft", el.setAttribute("role", "status"), el.textContent = text, this.ensureHost().appendChild(el);
    }
    toast(text) {
      let root = this.ensureHost();
      root.querySelector(".toast:not(.soft)")?.remove(), this.toastTimer !== null && this.win.clearTimeout(this.toastTimer);
      let el = this.doc.createElement("div");
      el.className = "toast", el.setAttribute("role", "status"), el.textContent = text, root.appendChild(el), this.toastTimer = this.win.setTimeout(() => el.remove(), 2600);
    }
  };

  // extensions/userscript/main.ts
  function signalInstalled() {
    let mark = () => {
      document.documentElement.setAttribute("data-im-installed", "1.2.0"), document.dispatchEvent(new CustomEvent("instagram-minimal:installed", { detail: "1.2.0" }));
    };
    document.documentElement && mark(), document.addEventListener("DOMContentLoaded", mark, { once: !0 });
  }
  function start() {
    if (window.__instagramMinimalUserscript) return;
    let engine = new BlockerEngine();
    engine.setFilters({ ...DEFAULT_FILTERS }), engine.start(), window.__instagramMinimalUserscript = engine;
  }
  /(^|\.)instagram\.com$/.test(location.hostname) ? document.documentElement ? start() : document.addEventListener("readystatechange", start, { once: !0 }) : signalInstalled();
})();
