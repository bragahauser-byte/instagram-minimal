# Android (Firefox)

No Android, o único navegador com suporte completo a extensões WebExtensions é o **Firefox**. Não há um app nativo: o Instagram Minimal para Android é o pacote `dist/firefox`, que declara `browser_specific_settings.gecko_android` (Firefox 128+).

O app oficial do Instagram não pode ser alterado por extensões; use o instagram.com no Firefox.

## Instalar

1. Publique o zip do Firefox no addons.mozilla.org (listado ou não listado). Ver [docs/publishing.md](../../docs/publishing.md).
2. No celular: Firefox → Menu → Extensões → Gerenciador de extensões → instale.

## Testar sem publicar

Com o celular conectado por USB, depuração USB ativa e o `adb` instalado no computador:

```bash
npm run build:ext -- firefox
npx web-ext run -s dist/firefox -t firefox-android --android-device <id-do-adb>
```

## Situação

Construído a partir do mesmo código testado no Chromium. **Não foi executado num aparelho Android** neste projeto.
