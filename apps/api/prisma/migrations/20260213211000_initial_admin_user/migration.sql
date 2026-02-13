-- Initial admin/bootstrap user for local/dev access.
-- Credentials:
-- email: admin@centrofit.local
-- password: DevPassword123!

INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "name",
  "phone",
  "role",
  "createdAt",
  "updatedAt"
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@centrofit.local',
  '$2b$12$r5cHEsmdU9OlWCGuwavDeO/wDDb9fdtQ1eD6ahBK/a149x8RGurYa',
  'Administrador Inicial',
  NULL,
  'SUPERADMIN',
  NOW(),
  NOW()
)
ON CONFLICT ("email")
DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "role" = EXCLUDED."role",
  "updatedAt" = NOW();

INSERT INTO "Center" (
  "id",
  "name",
  "slug",
  "timezone",
  "currency",
  "createdAt",
  "updatedAt"
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Centro Demo Inicial',
  'centro-demo-inicial',
  'America/Santiago',
  'clp',
  NOW(),
  NOW()
)
ON CONFLICT ("slug")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "timezone" = EXCLUDED."timezone",
  "currency" = EXCLUDED."currency",
  "updatedAt" = NOW();

INSERT INTO "CenterUser" (
  "id",
  "centerId",
  "userId",
  "role",
  "createdAt"
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'OWNER',
  NOW()
)
ON CONFLICT ("centerId", "userId")
DO UPDATE SET
  "role" = EXCLUDED."role";
