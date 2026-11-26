/** Página exibida quando um link direto de Reel é aberto (via declarativeNetRequest). */
document.getElementById('back')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (history.length > 1) history.back();
  else location.href = 'https://www.instagram.com/';
});
