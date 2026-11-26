/**
 * Instagram SIMULADO para os testes ponta a ponta. Uma SPA mínima que usa
 * history.pushState como o site real, carrega posts com atraso (rolagem
 * infinita) e abre Reels do Direct num diálogo em /p/CODE/, como o
 * instagram.com faz hoje. Todo o conteúdo é fictício.
 */
import * as M from './markup';

const app = document.getElementById('app')!;
let dialogOpen = false;

function view(path: string): string {
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 0) return M.desktopNav() + M.mobileNav() + M.feed(M.defaultFeedItems());
  if (seg[0] === 'direct') return M.desktopNav() + M.directThread();
  if (seg[0] === 'explore') return M.desktopNav() + (seg[1] === 'people' ? M.feed([M.peopleSuggestions()]) : M.exploreGrid());
  if (seg[0] === 'reels' || seg[0] === 'reel' || seg[1] === 'reel' || seg[1] === 'reels') return M.desktopNav() + M.reelsPage();
  if (seg[0] === 'stories') return M.storyViewer();
  if (seg[0] === 'p') return M.desktopNav() + `<main role="main">${M.postDialog(false, seg[1]).replace('role="dialog"', '')}</main>`;
  return M.desktopNav() + M.profilePage(seg[0]);
}

function render() {
  const path = location.pathname;
  if (dialogOpen && path.startsWith('/p/')) return; // diálogo aberto por cima
  dialogOpen = false;
  document.querySelector('[role="dialog"]')?.remove();
  app.innerHTML = view(path);
  document.title = `sim ${path}`;
  if (path === '/') {
    // Rolagem infinita: mais posts chegam depois.
    setTimeout(() => {
      const list = document.querySelector('[data-testid="feed-list"]');
      list?.insertAdjacentHTML('beforeend', `<div>${M.post('30', 'suggested')}</div><div>${M.post('31', 'followed')}</div>`);
    }, 400);
  }
}

function navigate(path: string) {
  history.pushState({}, '', path);
  render();
}

// Como o React do Instagram: escuta cliques na raiz (fase de bolha).
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const opener = t.closest('[data-open]');
  if (opener) {
    e.preventDefault();
    const path = opener.getAttribute('data-open')!;
    const isReel = !!opener.querySelector('svg[aria-label="Clip"]');
    history.pushState({}, '', path);
    dialogOpen = true;
    document.body.insertAdjacentHTML('beforeend', M.postDialog(isReel, path.split('/')[2]));
    (window as unknown as { __opened: string[] }).__opened.push(path);
    return;
  }
  const a = t.closest('a[href]');
  if (!a) return;
  const url = new URL(a.getAttribute('href')!, location.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  (window as unknown as { __opened: string[] }).__opened.push(url.pathname);
  navigate(url.pathname);
});

window.addEventListener('popstate', () => {
  dialogOpen = false;
  render();
});

(window as unknown as { __opened: string[] }).__opened = [];
(window as unknown as { __nav: (p: string) => void }).__nav = navigate;
render();
