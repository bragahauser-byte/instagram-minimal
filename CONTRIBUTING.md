# Contribuindo

Obrigado pelo interesse! O projeto tem três regras que não mudam:

1. **Privacidade primeiro.** Nada de rede, analytics, telemetria ou servidores. A extensão só roda em instagram.com.
2. **Não quebrar o Instagram.** Nunca remover nós da página; só atributos `data-im-*` e CSS.
3. **Sem burlar proteções.** Nada de APIs privadas, autenticação ou controles de acesso da Meta.

## Fluxo

```bash
npm ci
npm run typecheck && npm test
npm run test:e2e
```

- Algo escapou no site real? Reproduza o HTML em `tests/fixtures/markup.ts`, escreva o teste e ajuste `packages/filters/src/selectors.ts` (ver [docs/selectors.md](docs/selectors.md)).
- Ao abrir uma issue, **não envie prints de conversas privadas**. Descreva a estrutura (tags, `aria-label`, caminho do link).
- Textos da interface em português do Brasil; rótulos de detecção em pt/en/es.
- Commits pequenos, com mensagem descrevendo o porquê.
