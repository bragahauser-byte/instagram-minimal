# Material para as lojas (copiar e colar)

Depois de aprovado, cole o link da loja em `apps/dashboard/src/stores.ts`. O botão do site vira "Adicionar ao …" com um toque.

Arquivos: os `.zip` da [última versão](https://github.com/bragahauser-byte/instagram-minimal/releases/latest). Imagens: `docs/images/`.

## Nome

**Minimal para Instagram**
(As lojas costumam recusar nomes que começam com a marca de outra empresa. "Minimal para Instagram" descreve sem parecer oficial.)

## Resumo (até 132 caracteres)

Instagram sem Reels, sem vídeos curtos e sem posts sugeridos. Direct, Stories e quem você segue continuam iguais.

## Descrição

Use o Instagram sem o consumo infinito.

O Minimal para Instagram tira do instagram.com:
• Reels: a aba, as páginas, os links e os Reels enviados no Direct
• Publicações sugeridas de contas que você não segue
• Vídeos curtos recomendados
• Anúncios identificáveis
• A grade do Explorar (opcional)

Continua tudo igual: Direct, Stories, posts de quem você segue, curtidas, comentários, perfis, notificações e publicar.

Como usar: instale, toque em "Abrir o Instagram" e entre com sua conta, como sempre. O bloqueio já começa ligado.

Três modos: Manual, Automático (pausas voltam sozinhas) e Foco permanente (desativar exige uma pausa para pensar).

Privacidade: a extensão não pede nem vê sua senha, não tem servidor, não coleta dados e funciona só no instagram.com. Código aberto: https://github.com/bragahauser-byte/instagram-minimal

Projeto independente, não afiliado à Meta ou ao Instagram.

## Categoria

Produtividade (Chrome/Edge) · Privacidade e segurança ou Produtividade (Firefox)

## Propósito único (Chrome)

Remover Reels, vídeos curtos e conteúdo recomendado da interface do instagram.com, mantendo as demais funções.

## Justificativa das permissões

| Permissão | Texto |
|---|---|
| Acesso a instagram.com | Necessário para esconder Reels e publicações sugeridas na página do Instagram. A extensão não roda em nenhum outro site. |
| storage | Guarda as preferências da pessoa (modo e filtros) no próprio navegador. |
| declarativeNetRequest | Uma única regra: quando uma página de Reels é aberta diretamente, mostra a página de bloqueio da extensão. Nenhum conteúdo de requisição é lido. |
| alarms | Religa o bloqueio automaticamente quando uma pausa termina. |
| Código remoto | Não usa. Todo o código está no pacote. |

## Privacidade (formulário de dados)

- Coleta dados do usuário: **Não** (em todas as categorias).
- Vende ou transfere dados: **Não**.
- URL da política de privacidade: https://github.com/bragahauser-byte/instagram-minimal/blob/main/docs/privacy.md

## Lojas

| Loja | Custo | Link |
|---|---|---|
| Firefox (computador e Android) | grátis | https://addons.mozilla.org/developers/addon/submit/ |
| Microsoft Edge | grátis | https://partner.microsoft.com/dashboard/microsoftedge |
| Chrome Web Store | US$ 5, uma vez | https://chrome.google.com/webstore/devconsole |
| App Store (iPhone e Mac) | US$ 99/ano + um Mac | https://developer.apple.com/programs/ |
