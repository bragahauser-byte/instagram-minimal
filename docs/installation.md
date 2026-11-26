# Instalação

Depois de instalar em qualquer plataforma: abra **instagram.com**, entre normalmente e pronto. A configuração inicial abre sozinha na primeira vez (Chrome, Edge e Firefox).

## Baixar

Pegue os `.zip` em **[Releases](https://github.com/bragahauser-byte/instagram-minimal/releases/latest)**, ou gere localmente:

```bash
npm ci
npm run package     # cria release/instagram-minimal-<alvo>-v<versão>.zip
```

## Google Chrome e Microsoft Edge

1. Descompacte `instagram-minimal-chromium.zip`.
2. Abra `chrome://extensions` (Edge: `edge://extensions`).
3. Ligue o **Modo do desenvolvedor**.
4. **Carregar sem compactação** → escolha a pasta descompactada.
5. Fixe o ícone na barra para abrir o painel rápido.

Instalação pela loja: ver [publishing.md](publishing.md).

## Mozilla Firefox (desktop)

- **Teste rápido (temporário, some ao fechar o Firefox):** `about:debugging#/runtime/this-firefox` → **Carregar extensão temporária** → `manifest.json` de `dist/firefox`.
- **Permanente:** a Mozilla exige assinatura. Envie o zip ao [addons.mozilla.org](https://addons.mozilla.org/developers/) (pode ser "não listado", só para você). Ver [publishing.md](publishing.md).
- Se o painel mostrar *Sem acesso ao site*, toque em **Permitir acesso ao instagram.com**.

## Firefox para Android

Usa o mesmo pacote do Firefox (o manifest declara `gecko_android`). No Android, extensões só instalam a partir do addons.mozilla.org:

1. Publique (listado ou não) no AMO.
2. No Firefox do celular: **Menu → Extensões → Gerenciador de extensões**, encontre e instale.

Para testar sem publicar, com o celular no cabo e depuração USB ativa: `npx web-ext run -s dist/firefox -t firefox-android --android-device <id>` (precisa do `adb`). Ver [apps/android/README.md](../apps/android/README.md).

## Safari (macOS e iPhone)

Precisa de um Mac com Xcode 15 ou mais novo.

```bash
npm ci
npm run build:ext -- safari
node scripts/sync-safari.mjs
brew install xcodegen
cd apps/ios && xcodegen
open InstagramMinimal.xcodeproj
```

No Xcode, escolha seu **Team** em *Signing & Capabilities* nos quatro alvos e rode:

- **Mac:** alvo `InstagramMinimal-macOS`. Abra o app, clique em **Abrir configurações do Safari** e marque *Instagram Minimal*. Em versões de desenvolvimento, ative antes *Safari → Configurações → Avançado → Mostrar recursos para desenvolvedores* e *Desenvolvedor → Permitir extensões não assinadas*.
- **iPhone:** alvo `InstagramMinimal-iOS` com o aparelho conectado. Depois: **Ajustes → Apps → Safari → Extensões → Instagram Minimal**, ative e permita `instagram.com`. No Safari, o ícone de extensões na barra de endereço abre o painel.

Uma conta Apple gratuita permite instalar no seu próprio aparelho (o app expira em 7 dias). Distribuir pela App Store exige o Apple Developer Program.

## Desinstalar

Remova pela página de extensões do navegador (ou apague o app no iPhone/Mac). Nada fica para trás além da configuração local, apagada junto.
