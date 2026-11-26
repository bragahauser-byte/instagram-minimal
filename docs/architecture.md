# Arquitetura

## Visão geral

```
                 ┌────────────────────────── packages ──────────────────────────┐
                 │  core            filters               shared-ui              │
                 │  settings.ts     urls.ts (rotas)       ui.css (tokens)        │
                 │  modes.ts        selectors.ts (★)      components.tsx         │
                 │  storage.ts      classify.ts           App.tsx (telas)        │
                 │  platform.ts     engine.ts, styles.ts                         │
                 │                  dnr.ts                                       │
                 └───────┬──────────────────┬──────────────────────┬────────────┘
                         │                  │                      │
         extensions/common/src         (mesmo motor)         apps/dashboard
         content.ts  ← engine              │                 (GitHub Pages,
         background.ts ← dnr, modes        │                  prévia com localStorage)
         popup/options ← shared-ui         │
                         │                  │
     build-extensions.mjs (esbuild) ───────┘
        dist/chromium   dist/firefox   dist/safari ──► apps/ios (Xcode, SwiftUI)
```

★ `selectors.ts` é a **camada central de identificação**: todo seletor e todo texto usado para reconhecer partes do Instagram está ali.

## Pacotes

### `packages/core`
Código puro, sem DOM nem API de extensão.
- `settings.ts` — o estado salvo (`State`), filtros, padrões e `normalizeState`, que aceita qualquer valor (inclusive corrompido) e devolve um estado válido.
- `modes.ts` — `reduce(state, action, now)`: as regras dos três modos como funções puras. `isActive`, `effectiveFilters`, `nextTransitionIn`, `requiresUnlock`.
- `storage.ts` — `SettingsRepository` sobre uma interface `KeyValueArea`, com três implementações: `browser.storage.local` (extensão), `localStorage` (site) e memória (testes).

### `packages/filters`
- `urls.ts` — classifica caminhos (`/reel/…`, `/usuario/reels/`, `/explore/people/`…). Também exporta a regex usada pela regra de rede, testada contra a mesma classificação.
- `selectors.ts` — seletores e rótulos multilíngues. Ver [selectors.md](selectors.md).
- `classify.ts` — detectores que **só leem** a página: tipo de post do feed, cartões de Reel em conversas, blocos de grade, blocos de descoberta, diálogos que mostram Reel.
- `engine.ts` — `BlockerEngine`, que aplica os detectores e marca elementos.
- `styles.ts` — CSS injetado e mensagens.
- `dnr.ts` — regra `declarativeNetRequest`.

### `packages/shared-ui`
Design system (cores `#FFFFFF #F5F5F7 #86868B #1C1C1E #007AFF`, fonte do sistema, listas agrupadas, switch, modo escuro) e as telas: boas-vindas, escolha de modo, painel, bloqueios, privacidade e desbloqueio do modo Foco. As mesmas telas rodam no popup, na página de opções e na prévia do site.

## Camadas de bloqueio

1. **CSS imediato** (`document_start`): esconde a aba Reels e o item Explorar (nunca o de busca) antes de a página desenhar.
2. **Varredura**: um `MutationObserver` (só `childList`) agenda varreduras com debounce. Cada varredura calcula o conjunto desejado de marcações e aplica a diferença. É idempotente; nós reaproveitados pelo React são reavaliados.
3. **Cliques**: ouvintes em fase de captura na `window` impedem que cartões bloqueados e links de Reels abram (antes dos ouvintes do React).
4. **Rota e diálogos**: se a URL virar página de Reels, ou um diálogo mostrar um Reel (é assim que o Reel do Direct abre: em `/p/CODE/`), uma tela de bloqueio em Shadow DOM cobre a página e os vídeos são pausados continuamente.
5. **Rede**: a regra `declarativeNetRequest` redireciona carregamentos diretos de páginas de Reels (link colado, nova aba) para `blocked.html` antes de qualquer requisição sair.

## Princípios de estabilidade

- **Nunca remover nós do React**: só atributos `data-im-*` + CSS. A página não quebra e desligar a extensão restaura tudo.
- **Sem classes geradas**: caminhos de URL em `href`, `role`, `aria-label`, `<article>`, `[role=dialog]`.
- **Sem laço infinito**: as marcações são atributos, e o observer só observa `childList`.
- **Erros isolados**: cada detector roda em `try/catch`; uma falha não para os outros.
- **Conservador quando incerto**: se um cartão não é reconhecido com segurança, ele não é marcado como "bloqueado"; a proteção de rota e diálogo cobre o caso se ele abrir um Reel.

## Fluxo de configuração

Popup/opções → `SettingsRepository.dispatch(action)` → `reduce` → `storage.local.set` → `storage.onChanged` → content script (`engine.setFilters`) e background (regra de rede, alarme da pausa, badge). Um timer no content script e um alarme no background reativam o bloqueio quando uma pausa termina.

## iOS e macOS

`apps/ios` é um app SwiftUI contêiner com uma Safari Web Extension cujo recurso é exatamente `dist/safari`. O código nativo não toca no código web: só apresenta o projeto e ensina a ativar a extensão. As configurações vivem na extensão (fonte única).
