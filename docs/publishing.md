# Publicação

## GitHub

- **CI** (`.github/workflows/ci.yml`): typecheck, unitários, build, `web-ext lint`, testes ponta a ponta no Chromium e compilação do projeto Apple em macOS.
- **Site** (`pages.yml`): gera `apps/dashboard` e publica na branch `gh-pages` a cada push na `main`. Publica na branch `gh-pages`; em *Settings → Pages*, a fonte é **Deploy from a branch → gh-pages / (root)**.
- **Versões** (`release.yml`): ao enviar uma tag `v*`, gera os zips e cria a Release.

```bash
# atualize "version" no package.json e o CHANGELOG.md
git commit -am "versão 1.0.1"
git tag v1.0.1
git push origin main --tags
```

## Chrome Web Store

1. Conta de desenvolvedor (taxa única de US$ 5) em https://chrome.google.com/webstore/devconsole.
2. *Novo item* → envie `instagram-minimal-chromium-v*.zip`.
3. Privacidade: propósito único "remover Reels e conteúdo recomendado do Instagram"; justifique cada permissão com o texto de [privacy.md](privacy.md); declare que não coleta dados.
4. Use as imagens de `docs/images/`.

## Microsoft Edge Add-ons

https://partner.microsoft.com/dashboard/microsoftedge — gratuito. Envie o mesmo zip do Chromium.

## Firefox (desktop e Android)

1. Conta gratuita em https://addons.mozilla.org/developers/.
2. Envie `instagram-minimal-firefox-v*.zip`. Escolha *listado* (aparece na busca, inclusive no Android) ou *não listado* (só você instala pelo arquivo assinado).
3. O código não é minificado, então não é preciso enviar o código-fonte separado. Se pedirem, aponte para este repositório (`npm ci && npm run build:ext -- firefox`).
4. `data_collection_permissions` já declara "nenhum dado coletado".

## App Store (iPhone e Mac)

1. Apple Developer Program (US$ 99/ano).
2. No Xcode: Team nos quatro alvos, *Product → Archive*, envie pelo Organizer para o App Store Connect.
3. Preencha a privacidade do app como "Nenhum dado coletado".

## Nome e marca

O nome "Instagram Minimal" descreve com qual site a extensão funciona. As lojas podem pedir que a marca de terceiros não seja o destaque do nome (por exemplo, "Minimal para Instagram"). O ícone do projeto é próprio e não usa a marca do Instagram.
