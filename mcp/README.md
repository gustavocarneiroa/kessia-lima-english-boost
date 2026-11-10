# MCP do portal (kessia-portal)

Deixa o Claude fazer tarefas do portal no lugar da professora: criar/editar atividades
"Feita por você" e de listening, enviar atividades pra alunos, listar alunos/atividades e,
pelas ferramentas genéricas `portal_get` / `portal_request`, qualquer outra rota da API.

## Como ligar

1. Portal → **Configurações** → card **Acesso do Claude** → "Gerar chave" e copiar.
2. Salvar a chave (uma linha só) no arquivo `~/.kessia-portal-token`
   (no Windows: `C:\Users\<você>\.kessia-portal-token`). Ou usar a variável `KESSIA_PORTAL_TOKEN`.
3. `npm install` dentro de `mcp/` (só na primeira vez).
4. O `.mcp.json` na raiz do projeto já registra o servidor — o Claude Code pede pra aprovar na primeira vez.

`KESSIA_API_URL` troca o endereço da API (padrão: produção; pra testar: `http://localhost:3200`).

## Segurança

- A chave só funciona pra conta da professora e não acessa `/api/auth/*` nem `/api/webauthn/*`
  (não troca senha, não mexe em aparelhos/sessões) nem cria/apaga outras chaves.
- No banco fica só o hash (`api_tokens`). Apagar a chave em Configurações corta o acesso na hora.
