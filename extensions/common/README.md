# Código comum das extensões

- `src/content.ts` — roda em instagram.com e entrega os filtros ao `BlockerEngine`.
- `src/background.ts` — regra de rede, alarme da pausa, badge, configuração inicial.
- `src/popup.tsx`, `src/options.tsx` — painel (React, `@im/ui`).
- `static/blocked.html` — página mostrada quando um link de Reel é aberto direto.

Cada navegador tem só o próprio `manifest.json` em `extensions/<alvo>/`. Build: `npm run build:ext`.
