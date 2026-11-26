# Instalação

Depois de instalar em qualquer plataforma: abra **instagram.com**, entre normalmente e pronto. A configuração inicial abre sozinha na primeira vez (Chrome, Edge e Firefox).

## Celular, de graça (recomendado)

O app do Instagram, o Chrome do iPhone e o Chrome do Android **não aceitam nenhum tipo de complemento**. Por isso, no celular o Instagram Minimal roda como *userscript* (o mesmo motor da extensão) em navegadores que aceitam, sem pagar nada e sem conta nova.

O jeito mais fácil: **abra https://bragahauser-byte.github.io/instagram-minimal/ no celular** e siga os passos que aparecem.

### iPhone (Safari)

1. Instale o app gratuito [Userscripts](https://apps.apple.com/br/app/userscripts/id1463298887), abra uma vez e escolha uma pasta quando ele pedir.
2. **Ajustes → Apps → Safari → Extensões → Userscripts**: ative e permita em `instagram.com` (ou "Todos os sites").
3. No Safari, abra [instagram-minimal.user.js](https://bragahauser-byte.github.io/instagram-minimal/instagram-minimal.user.js), toque no ícone **ᴬA** da barra → **Userscripts** → **Instalar**.
4. Abra o instagram.com no Safari e entre com sua conta.

### Android (Firefox)

1. Instale o [Firefox](https://play.google.com/store/apps/details?id=org.mozilla.firefox).
2. No Firefox, instale o [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) (grátis; o Tampermonkey também funciona).
3. Abra [instagram-minimal.user.js](https://bragahauser-byte.github.io/instagram-minimal/instagram-minimal.user.js) e toque em **Confirmar instalação**.
4. Abra o instagram.com no Firefox e entre com sua conta.

O userscript liga todos os bloqueios. Para pausar, desligue o script no app (Userscripts ou Violentmonkey). Ele se atualiza sozinho pelo mesmo endereço. Diferença para a extensão: não tem painel nem modos, e o bloqueio de links diretos é feito pela tela de bloqueio (não pela regra de rede).

## Baixar (computador)

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
