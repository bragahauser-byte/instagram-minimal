# iOS e macOS (Safari)

App SwiftUI contêiner + Safari Web Extension, para iPhone/iPad (iOS 17+) e Mac (macOS 14+). O recurso da extensão é exatamente `dist/safari`.

O app não acessa o Instagram e não guarda dados: apresenta o projeto, mostra como ativar a extensão e as garantias de privacidade. Modo e bloqueios são escolhidos no painel da extensão, dentro do Safari.

## Gerar e rodar (Mac)

```bash
# na raiz do repositório
npm ci && npm run build:ext -- safari && node scripts/sync-safari.mjs
brew install xcodegen
cd apps/ios && xcodegen && open InstagramMinimal.xcodeproj
```

Defina o **Team** nos quatro alvos e rode `InstagramMinimal-iOS` ou `InstagramMinimal-macOS`.

## O que falta para rodar num aparelho

- Um Mac com Xcode (este projeto foi escrito num Windows).
- Uma conta Apple (gratuita instala no seu aparelho por 7 dias; App Store exige o Apple Developer Program).
- O CI compila os dois alvos em macOS sem assinatura; a instalação e o uso num iPhone/Mac reais **ainda não foram feitos**.
