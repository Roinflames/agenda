# Render deploy (Blueprint + GitHub Actions)

## Opcion A: Blueprint (render.yaml)
1. En Render: New + `Blueprint`.
2. Selecciona tu repo y deja que Render detecte `render.yaml`.
3. En el servicio `boxmagic-api` agrega env vars secretas:
- `DATABASE_URL` (Neon)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Nota: para migraciones en prod, puedes ejecutar manualmente (Shell):
`npm ci && npm run prisma:migrate:deploy -w apps/api`

## Opcion B: Deploy hooks + GitHub Actions
1. En cada servicio Render: Settings -> Deploy Hook -> copia URL.
2. En GitHub repo -> Settings -> Secrets and variables -> Actions:
- `RENDER_DEPLOY_HOOK_API`
- `RENDER_DEPLOY_HOOK_WEB`
3. Push a `main` dispara `.github/workflows/deploy-render.yml`.

