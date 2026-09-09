# Kessia Lima English Boost

Repositório monolítico do portal da Kessia Lima English Boost.

## Estrutura

```text
frontend/   # React + Vite + TypeScript + Supabase (site público, deploy via Cloudflare Pages)
server/     # API Node.js (Fastify) — identifica professora x aluno, deploy próprio no VPS
```

## Frontend

```sh
cd frontend
npm i
npm run dev
```

Deploy: Cloudflare Pages, apontando para a pasta `frontend/` (root directory), build
`npm run build`, output `dist`.

## Backend (`server/`)

Ver [`server/README.md`](server/README.md). Mesmo padrão de deploy do projeto `getflix`:
push em `main` → GitHub Actions → SSH no VPS (`45.90.123.41`) → `api.teacherkessialima.com.br`.
