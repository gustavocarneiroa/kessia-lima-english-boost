# Contexto do projeto — Teacher Kessia Lima

## Quem você está ajudando

A pessoa que usa este projeto **não é programadora**. Ela é a Kessia (professora de
inglês) ou alguém de confiança dela cuidando do site. Isso muda como você deve se
comunicar, e essa é a sua principal habilidade aqui:

- **Fale em português simples, sem jargão técnico.** Em vez de "fiz o deploy do
  backend", diga "publiquei a atualização no site". Em vez de "a API retornou 401",
  diga "o sistema não reconheceu o login". Se precisar usar um termo técnico
  (deploy, banco de dados, domínio, etc.), explique em uma frase o que ele significa
  na prática.
- **Pergunte antes de assumir.** Se um pedido for ambíguo ou faltar informação que
  só ela sabe (ex: "quero um botão de X" sem dizer onde, ou "muda a cor" sem dizer
  qual cor), pergunte de forma simples e com opções concretas, em vez de adivinhar
  ou pedir detalhes técnicos que ela não teria como saber.
- **Confirme ações importantes em termos do resultado, não do processo.** Em vez de
  "vou dar push na main", diga "vou publicar essa mudança no site — a partir de
  alguns minutos ela já aparece pra quem acessar". Ela não precisa saber o que é
  git, GitHub Actions, systemd, nginx etc. a menos que pergunte.
- **Depois de qualquer mudança visível, diga como ela pode ver o resultado**
  (endereço/link, o que esperar na tela).

## O que é este site

Site da Teacher Kessia Lima (professora de inglês), em `teacherkessialima.com.br`.
Tem duas partes:

1. **Site público** — página institucional (sobre, serviços, depoimentos, preços,
   FAQ, contato) que qualquer visitante vê.
2. **Portal com login** (em `/login` e `/portal`) — só pra professora e alunos
   cadastrados. Hoje faz só isto:
   - A professora entra com `kessialima@teacherkessialima.com.br`. Na primeira vez
     que ela loga, a senha que ela digitar vira a senha dela dali pra frente.
   - Ela pode cadastrar o e-mail de um aluno na tela do portal. Quando esse aluno
     tentar entrar pela primeira vez com aquele e-mail, a senha que ele digitar
     também vira a senha dele.
   - Depois de logado, dá pra "adicionar este dispositivo" — assim da próxima vez
     entra com a digital/reconhecimento facial/PIN do celular ou computador, sem
     digitar senha.
   - O site funciona como **app instalável** (PWA): no celular, dá pra "adicionar à
     tela inicial" e abre como um aplicativo.
   - Ainda não tem nenhuma funcionalidade pro aluno além de logar — isso vai crescer
     aos poucos, sob pedido.

## Como o site é publicado (visão geral, sem jargão)

- O **site público** é hospedado no Cloudflare Pages. Toda vez que uma mudança é
  enviada, o site atualiza sozinho em alguns minutos.
- O **sistema de login** roda num servidor próprio (mesma máquina que hospeda o
  projeto "Getflix", outro projeto do mesmo desenvolvedor) e também atualiza
  sozinho quando há mudança no código de login/portal.
- Os dados dos alunos (e-mails, senhas criptografadas) ficam guardados num arquivo
  de banco de dados só nesse servidor — não é um serviço de terceiros.

## Estrutura técnica (referência interna — não precisa explicar isso pra ela)

```text
frontend/   # site (React + Vite). Cloudflare Pages publica a partir daqui.
server/     # sistema de login/portal (Node.js + Fastify + SQLite)
```

- `frontend/`: Vite + React + TypeScript + Tailwind + shadcn/ui. Rotas em
  `frontend/src/App.tsx`. Login/portal em `frontend/src/pages/Login.tsx` e
  `Portal.tsx`, estado de sessão em `frontend/src/contexts/AuthContext.tsx`,
  chamadas à API em `frontend/src/lib/api.ts`. PWA configurado via
  `vite-plugin-pwa` em `frontend/vite.config.ts`.
- `server/`: Node 22 (TypeScript nativo, sem build step — `node
  --experimental-strip-types`). Fastify. SQLite via `better-sqlite3` +
  `drizzle-orm` (schema em `server/src/db/schema.ts`, tabelas criadas
  automaticamente ao iniciar). Auth por sessão em cookie httpOnly (JWT via
  `jose`). WebAuthn (passkey) via `@simplewebauthn/*`.
- Domínio de e-mail que define "é professora": `teacherkessialima.com.br` — ver
  `server/src/lib/role.ts` e `TEACHER_EMAIL_DOMAIN`/`ADMIN_EMAIL` em
  `server/src/env.ts`.
- **Deploy do `server/`**: push em `main` que toque `server/**` dispara
  `.github/workflows/deploy-server.yml` — SSH no VPS (`45.90.123.41`), atualiza o
  código, roda `npm run db:migrate` (cria tabelas se não existirem + garante que a
  professora admin exista) e reinicia o serviço `kessia-server` (systemd), atrás de
  nginx em `api.teacherkessialima.com.br` (HTTPS via certbot).
- **Deploy do `frontend/`**: Cloudflare Pages, root directory `frontend/`, build
  `npm run build`, output `dist`.
- Mesmo padrão de infraestrutura do projeto `getflix` (outro projeto do mesmo
  desenvolvedor, mesmo VPS) — usuário de sistema dedicado (`kessia`), unidade
  systemd própria, vhost nginx próprio, chave SSH de deploy própria. Zero
  interferência entre projetos no mesmo servidor.

## Decisões e histórico relevante

- O projeto começou como um site simples só de landing page (Lovable + Supabase,
  com um jogo Wordle e integração de dicionário). O Supabase (`frontend/supabase`,
  `frontend/src/integrations/supabase`) ainda está lá, usado por essas features
  antigas — **não é o banco do sistema de login**, que é SQLite separado.
- `frontend/.env` está versionado no git com as chaves do Supabase (chave pública,
  não é segredo) — isso já vinha de antes desta reestruturação.
- Sem banco de dados de alunos ainda além de e-mail/senha — qualquer feature nova
  pra aluno (notas, exercícios, agenda etc.) precisa ser desenhada quando for
  pedida, não existe estrutura pronta pra isso.
