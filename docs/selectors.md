# Seletores e como atualizar os filtros

O Instagram muda a interface com frequência. Todo o reconhecimento fica em **`packages/filters/src/selectors.ts`** (rótulos e seletores) e **`urls.ts`** (rotas). Quase sempre basta editar esses dois arquivos.

## O que é usado (observado em 26/nov/2026, web desktop, logado)

| Parte | Como é reconhecida | Por quê |
|---|---|---|
| Aba Reels | `a[href="/reels/"]`, `a[href$="/reels/"]` | Caminho de URL é estável |
| Item Explorar | `a[href="/explore/"]` **sem** `svg[aria-label="Search"]` | No celular e no desktop atual o `/explore/` é a busca; a busca nunca é escondida |
| Post do feed | `<article>` dentro de `main` | Semântico |
| Post sugerido | rótulo exato "Suggested for you"/"Sugestões para você"… **ou** botão "Follow"/"Seguir" dentro do post | No feed, só aparece botão de seguir em conta que você não segue |
| Anúncio | link `facebook.com/ads/…`/`/ads/ig_redirect` **ou** rótulo "Ad"/"Sponsored"/"Patrocinado" | O link de anúncio é o sinal mais forte |
| Reel no feed | link `/reels/CODE/` ou `/reel/CODE/`, ou ícone de Reel; **ou** link `/reels/audio/ID/` **junto de** um `<video>` | Fotos com música também têm link de áudio; por isso o áudio sozinho não basta |
| Vídeo comum | `<video>` sem os sinais acima (link `/p/CODE/`) | Preservado |
| Bloco de descoberta | cabeçalho "Suggested reels"/"Reels sugeridos"… que contenha links de posts/Reels | Pessoas sugeridas não têm links de post e ficam |
| Reel no Direct | `svg[aria-label="Clip"]` (ou "Reel") dentro de `[role=button]` dentro de uma bolha `[role="article"]` | O cartão não tem `href`; posts do feed usam a tag `<article>`, que não casa com `[role="article"]` |
| Reel aberto pelo Direct | `[role=dialog]` em `/p/CODE/` cujo post traz `/usuario/reel/CODE/` ou `/reels/audio/` + `<video>` | O Instagram abre o Reel como post |
| Blocos de grade | `a[href]` para `/p/` ou `/reel/` contendo `img`/`video`; Reel = ícone "Reel"/"Clip" ou href `/reel/` | Explorar, hashtags, perfis |
| Fechar diálogo | tecla Esc; depois `svg[aria-label="Close"]` dentro do diálogo | Volta para a conversa; `history.back()` não |

Rótulos são comparados de forma **exata** em nós-folha, sem diferenciar maiúsculas, e existem em português, inglês e espanhol.

## Quando algo parar de funcionar

1. Abra uma aba do instagram.com.
2. Gere o script de diagnóstico: `node scripts/build-debug-inject.mjs` e cole `dist/debug/inject.js` no console (F12). Ele roda o mesmo motor com todos os filtros e expõe `window.__instagramMinimal`.
3. `__instagramMinimal.lastReport` mostra a rota e quantos itens foram escondidos/trocados por motivo.
4. Inspecione o elemento que escapou e veja qual sinal mudou (um `aria-label`, um caminho de URL, um texto).
5. Atualize `selectors.ts`, reproduza o caso em `tests/fixtures/markup.ts`, adicione um teste e rode `npm test`.

## Rótulos em outros idiomas

Para suportar um idioma novo, acrescente as traduções em `LABELS` (`suggested`, `sponsored`, `follow`, `reelIcon`, `searchIcon`, `close`, `suggestedContentHeadings`). Prefira sinais estruturais (URL, ARIA) sempre que possível.
