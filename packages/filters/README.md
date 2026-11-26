# @im/filters

Identificação dos componentes do Instagram e motor de bloqueio.

- `selectors.ts` — **camada central de identificação** (seletores e rótulos). Ver [docs/selectors.md](../../docs/selectors.md).
- `urls.ts` — classificação de rotas e links.
- `classify.ts` — detectores (só leitura).
- `engine.ts` — `BlockerEngine`: varredura, cliques, rota, tela de bloqueio.
- `styles.ts` — CSS injetado e mensagens.
- `dnr.ts` — regra `declarativeNetRequest`.
