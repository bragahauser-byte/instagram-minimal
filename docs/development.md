# Desenvolvimento

Requisitos: Node 20+ (testado com Node 26). Para o projeto Apple: macOS, Xcode 15+ e XcodeGen.

```bash
npm ci
npm run build:ext        # dist/chromium, dist/firefox, dist/safari
npm run dev:dashboard    # site do projeto em modo desenvolvimento
npm run build            # extensões + site
npm run typecheck
npm test                 # unitários (Vitest + jsdom)
npm run test:e2e         # build + Playwright com a extensão num Chromium real
npm run package          # zips em release/
npm run icons            # regenera os PNGs a partir de assets/logo.svg
node scripts/screenshots.mjs        # imagens de docs/images
node scripts/build-debug-inject.mjs # script de diagnóstico para o console do instagram.com
```

## Carregar durante o desenvolvimento

- Chrome: `chrome://extensions` → Carregar sem compactação → `dist/chromium`. Depois de `npm run build:ext`, clique em recarregar na extensão e atualize a aba.
- Firefox: `about:debugging` → Carregar extensão temporária → `dist/firefox/manifest.json`.

## Testes

- `tests/fixtures/markup.ts` — HTML fictício que imita a estrutura real (com classes aleatórias, para garantir que nada depende delas).
- `tests/fixtures/sim.ts` — Instagram simulado (SPA com `pushState`, rolagem infinita, Reel do Direct abrindo em diálogo `/p/`).
- `tests/unit/*` — rotas, classificação, motor, modos, armazenamento.
- `tests/e2e/*` — Chromium com `dist/chromium`; `https://www.instagram.com/*` é respondido pelo simulador e qualquer outra requisição é abortada.

Ao corrigir algo que escapou no site real: reproduza o HTML no `markup.ts`, escreva o teste, corrija `selectors.ts`/`classify.ts`.

## Convenções

- Nada de classes CSS do Instagram.
- Detectores não alteram a página; só o `engine` marca.
- Nenhuma requisição de rede no código da extensão.
- Textos da interface em português do Brasil.
