# CentroFit SaaS (MVP)

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

Credencial inicial por migracion (recovery):
- `admin@centrofit.local` / `DevPassword123!`

API Docs: `http://localhost:3001/docs`

## Reportes de negocio
- Endpoint API: `GET /reportes/negocio?centerId=<CENTER_ID>&year=<YYYY>`
- Incluye:
  - Ingresos mensuales del anio seleccionado vs anio anterior.
  - Ingreso anual y variacion porcentual YoY.
  - Conteo de alumnos por estado (`ACTIVO`, `CONGELADO`, `SUSPENDIDO`, `PRUEBA`) e inactivos agregados.
    - La metrica de alumnos considera solo usuarios con rol `MEMBER`.
  - Evolucion mensual de alumnos activos/inactivos basada en reservas confirmadas.
  - Termino de plan por alumno (`endsAt`, dias restantes, plan y estado del alumno), con resumen de:
    - vencidos
    - vencen en 7 dias
    - vencen en 30 dias
    - sin fecha de termino
- UI:
  - Vista `Reportes` en `apps/web/src/routes/Reports.tsx` consume `api.reportsBusiness(...)`.
- Nota:
  - No existe historial temporal del estado administrativo del alumno; por eso la evolucion mensual de activos/inactivos se calcula por actividad real (reservas confirmadas) y no por historial de cambios de estado.

## Deploy Render
Ver `infra/render/README.md` y `render.yaml`.

## Documento SRS (IEEE 830)
- Base de requisitos: `docs/SRS_IEEE830.md`

## Etapas de desarrollo (ciclo de vida)
### Etapa 1 - Descubrimiento y alcance
- Objetivo: alinear objetivos de negocio, alcance MVP y restricciones.
- Salida esperada: backlog inicial priorizado y supuestos validados.

### Etapa 2 - Especificacion funcional
- Objetivo: formalizar requisitos en SRS IEEE 830.
- Salida esperada: `RF`, `RNF`, `RB` y `CA` aprobados.

### Etapa 3 - Diseno tecnico
- Objetivo: cerrar arquitectura, datos y contratos API/UI.
- Salida esperada: decisiones tecnicas documentadas y modelo de datos estable.

### Etapa 4 - Construccion MVP
- Objetivo: implementar modulos core (auth, centros, usuarios, reservas, membresias, pagos, reportes).
- Salida esperada: flujo E2E operativo en ambiente de prueba.

### Etapa 5 - Pruebas y hardening
- Objetivo: validar criterios de aceptacion, seguridad base y estabilidad.
- Salida esperada: correcciones criticas cerradas y release candidata.

### Etapa 6 - Deploy y operacion
- Objetivo: publicar en Render, monitorear salud y preparar iteraciones.
- Salida esperada: despliegue estable + plan de mejoras por release.

## Releases sugeridas
- `v0.1.0`: Base operativa (auth, centros, usuarios, reservas).
- `v0.2.0`: Membresias, pagos y webhook.
- `v0.3.0`: Reportes y ajustes de UX operativa.
- `v0.4.0`: Agenda operativa (horarios, bloqueos, calendario semanal) + reportes avanzados de agenda.
- `v0.5.0`: Notificaciones operativas (email/push) con historial y envío manual desde UI.
- `v1.0.0`: Cierre MVP validado con criterios de aceptacion.
