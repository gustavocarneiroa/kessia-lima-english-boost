# Kessia API

Backend simples do portal Kessia Lima English Boost.

## O que faz hoje

- `GET /health` — healthcheck
- `POST /api/identify` — recebe `{ email }` e responde `{ email, role }`, onde `role`
  é `"teacher"` se o e-mail for do domínio `TEACHER_EMAIL_DOMAIN`
  (`@teacherkessialima.com.br`) e `"student"` caso contrário.

## Stack

- Node.js 22 LTS (TypeScript nativo via `--experimental-strip-types`, sem build step)
- Fastify + zod

## Rodando localmente

```sh
cd server
cp .env.example .env
npm i
npm run dev
```

## Deploy

Mesmo padrão do projeto `getflix`: push em `main` que toque `server/**` dispara
`.github/workflows/deploy-server.yml`, que faz SSH no VPS (`45.90.123.41`), atualiza
o código e reinicia o serviço `kessia-server` (systemd), atrás de nginx em
`api.teacherkessialima.com.br`.
