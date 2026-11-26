# Limitações conhecidas

Honestidade sobre o que foi e o que não foi comprovado.

## O que foi testado e como

| Item | Unitário (jsdom) | Ponta a ponta (Chromium + extensão, site simulado) | Instagram real (26/nov/2026) |
|---|---|---|---|
| Remover sugeridos e anúncios | ✓ | ✓ | ✓ 12 de 18 posts removidos, 0 erros |
| Preservar posts e vídeos comuns de quem você segue | ✓ | ✓ | ✓ dois vídeos `/p/` preservados |
| Reel no Direct vira "Reel bloqueado." | ✓ | ✓ | ✓ 3 cartões, nenhum falso positivo |
| Cartão bloqueado não abre ao clicar | ✓ | ✓ | ✓ clique real do mouse |
| Reel que abre mesmo assim é coberto | ✓ | ✓ | ✓ diálogo `/p/` coberto, vídeo pausado |
| Janela flutuante de conversa | ✓ | — | ✓ (achado e corrigido durante o teste real) |
| Explorar oculto / acessível | ✓ | ✓ | ✓ 18 blocos ocultos / 11 Reels trocados |
| Aba Reels escondida, clique bloqueado | ✓ | ✓ | ✓ |
| Link direto de Reel (regra de rede) | ✓ regex | ✓ redireciona antes de qualquer requisição | não testado no real |
| Três modos, persistência, recarregar | ✓ | ✓ | — |
| Stories intactos | ✓ | ✓ | não aberto (abrir marca o Story como visto) |

No teste real, o motor foi injetado numa aba logada do Chrome (o mesmo código do content script); a extensão empacotada foi testada no Chromium do Playwright.

## Não verificado

- **Edge, Firefox, Firefox para Android, Safari macOS e Safari iOS** não foram executados num navegador real. Edge usa o mesmo pacote e o mesmo motor do Chrome. Firefox passa por `web-ext lint` no CI. O projeto Apple é compilado no CI (simulador iOS e macOS, sem assinatura), mas não foi instalado num aparelho.
- **Instagram em outros idiomas**: rótulos em pt/en/es estão na lista, mas o teste real foi com a interface em inglês.
- **Instagram web no celular** (layout mobile): coberto pelos seletores de URL/ARIA e por fixtures, não testado num celular real.
- **Safari**: o suporte a `declarativeNetRequest` com redirecionamento para a página da extensão varia por versão. Se não funcionar, a camada do content script (tela de bloqueio) continua protegendo.

## Userscript no celular

- Testado com o script injetado numa tela de iPhone simulada (Chromium do Playwright). O fluxo real com o app Userscripts no Safari do iPhone e com o Violentmonkey no Firefox para Android **não foi executado num aparelho**.
- Todos os bloqueios ficam ligados; não há painel nem modos (pausar = desligar o script no app).
- Sem a regra de rede: um link de Reel aberto direto mostra a tela de bloqueio depois que a página começa a carregar.

## Limitações técnicas

- **Depende da interface do Instagram.** Mudanças de estrutura podem fazer algo escapar até os seletores serem atualizados ([selectors.md](selectors.md)). Por isso há várias camadas: se o cartão escapar, a tela de bloqueio cobre quando o Reel abre.
- **Reel × vídeo comum**: hoje o Instagram publica quase todo vídeo novo como Reel. Vídeos que o próprio Instagram trata como post comum (`/p/` sem sinais de Reel) são preservados.
- **Reel compartilhado não reconhecido** (sem o ícone): não é marcado como bloqueado no cartão. A proteção é conservadora: ao abrir, se for Reel, a tela de bloqueio cobre.
- **Sugeridos sem rótulo nem botão Seguir**: se o Instagram mostrar conteúdo recomendado sem nenhum desses sinais, ele passa.
- **Stories que repostam um Reel**: o Story é preservado (Stories estão na lista do que deve continuar funcionando).
- **App oficial do Instagram**: extensões só agem no navegador. O app instalado no celular não é afetado; para usar o Instagram Minimal no celular, use o instagram.com no Safari (iPhone) ou no Firefox (Android).
- **Modo Foco** dificulta, não impede: quem é dono do aparelho sempre pode concluir o desbloqueio ou remover a extensão. Isso é intencional.
- **Firefox MV3**: a permissão de site pode precisar ser concedida pelo painel.
