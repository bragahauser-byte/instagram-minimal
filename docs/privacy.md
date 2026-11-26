# Privacidade e permissões

## Garantias

- **Nenhuma senha.** Você entra no Instagram oficial. A extensão não tem tela de login, não lê campos de senha e não guarda credenciais.
- **Nenhuma conta intermediada.** Não existe conta do Instagram Minimal nem servidor.
- **Sessão intacta.** Cookies e a sessão do navegador não são lidos nem alterados.
- **Configurações locais.** Só uma chave é salva: `im:state` em `browser.storage.local`, com o modo, os filtros e horários de pausa. Os testes verificam que nada além disso é gravado.
- **Mensagens não são lidas nem guardadas.** O content script olha a *estrutura* da página (atributos como `href`, `role`, `aria-label` e rótulos curtos como "Suggested for you") para decidir o que esconder. Ele não copia, guarda ou envia texto de conversas.
- **Sem rede.** O código da extensão não faz nenhuma requisição (`fetch`, XHR, WebSocket, beacon). Dá para conferir: `grep -E "fetch\(|XMLHttpRequest|sendBeacon|WebSocket" dist/*/*.js` não encontra nada.
- **Sem analytics, anúncios, rastreadores ou telemetria.**
- **Site do projeto sem dados da conta.** A página do GitHub Pages não conversa com a extensão; a prévia usa só o `localStorage` daquele site.

## Permissões

| Permissão | Para quê |
|---|---|
| `host_permissions`: `https://www.instagram.com/*`, `https://instagram.com/*` | Rodar os filtros apenas no Instagram. Nenhum outro site. |
| `storage` | Guardar suas escolhas neste aparelho. |
| `declarativeNetRequestWithHostAccess` (Chrome/Edge/Firefox) / `declarativeNetRequest` (Safari) | Uma única regra: quando uma página de Reels é aberta diretamente, redirecionar para a página de bloqueio da própria extensão. A regra não lê o conteúdo de nenhuma requisição. |
| `alarms` | Reativar o bloqueio quando uma pausa termina. |

`web_accessible_resources` expõe ao instagram.com apenas `blocked.html`, `blocked.js` e o ícone, necessários para o redirecionamento.

No Firefox (MV3), o acesso ao site pode precisar ser concedido manualmente; o painel mostra "Permitir acesso ao instagram.com" quando falta.

## O que NÃO é feito

Nenhuma API privada da Meta, nenhuma engenharia reversa de autenticação, nenhuma tentativa de burlar proteções ou controles de acesso. A extensão só muda o que aparece na sua tela e para onde a navegação local vai.
