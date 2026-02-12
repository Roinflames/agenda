# BoxMagic SaaS (MVP)

Monorepo:
- `apps/api`: NestJS + Prisma + Postgres (Neon)
- `apps/web`: React + Vite + Tailwind (admin UI)

## Requisitos
- Node 20+
- Postgres (recomendado: Neon)

## Variables de entorno
- Root: `.env` (para seed/dev) ejemplo en `.env.example`
- Prisma en `apps/api` lee `.env` en su carpeta:
  - `cp ../../.env .env`

## Local
```bash
cd boxmagic-saas
npm install

# Prisma (en apps/api)
cd apps/api
cp ../../.env .env
cd ../..

npm run prisma:generate -w apps/api
npm run prisma:migrate -w apps/api
npm run prisma:seed -w apps/api

# API
npm run dev:api

# WEB
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

UI: `http://localhost:5173/login`

Credenciales seed:
- `rreyes@example.com` / `DevPassword123!`
- `francisca.beltran@example.com` / `DevPassword123!`

API Docs: `http://localhost:3001/docs`

## Deploy Render
Ver `infra/render/README.md` y `render.yaml`.

