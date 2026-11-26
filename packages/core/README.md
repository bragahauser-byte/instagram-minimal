# @im/core

Modelo de configuração, regras dos três modos (funções puras) e armazenamento. Sem DOM e sem API de extensão: roda igual no navegador, na extensão e nos testes.

- `settings.ts` — `State`, filtros, padrões, `normalizeState`.
- `modes.ts` — `reduce(state, action, now)`, `isActive`, `effectiveFilters`, regras do modo Foco.
- `storage.ts` — `SettingsRepository` + `extensionArea`, `localStorageArea`, `memoryArea`.
- `platform.ts` — identifica o navegador (só para exibir).
