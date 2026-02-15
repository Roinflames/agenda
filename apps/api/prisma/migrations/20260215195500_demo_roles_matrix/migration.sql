-- Demo roles matrix:
-- - Rodrigo (Comunidad Virtual): SUPERADMIN + OWNER del centro Comunidad Virtual
-- - Francisca y Felipe: OWNER de Felimor
-- - Juan: MEMBER de Felimor

WITH target_centers AS (
  SELECT "id", "slug", "name"
  FROM "Center"
),
rod AS (
  SELECT "id" FROM "User" WHERE lower("email") = 'rreyes@example.com' LIMIT 1
),
fra AS (
  SELECT "id" FROM "User" WHERE lower("email") = 'francisca.beltran@example.com' LIMIT 1
),
fel AS (
  SELECT "id" FROM "User" WHERE lower("email") = 'felipe.salazar@example.com' LIMIT 1
),
juan AS (
  SELECT "id" FROM "User" WHERE lower("email") = 'juan.perez@example.com' LIMIT 1
),
cv AS (
  SELECT "id" FROM target_centers
  WHERE lower("slug") LIKE 'comunidad-virtual%'
     OR lower("name") LIKE '%comunidad virtual%'
  LIMIT 1
),
felimor AS (
  SELECT "id" FROM target_centers
  WHERE lower("slug") LIKE 'felimor%'
     OR lower("name") LIKE '%felimor%'
  LIMIT 1
)
UPDATE "User" u
SET "role" = CAST('SUPERADMIN' AS "UserRole")
FROM rod
WHERE u."id" = rod."id";

INSERT INTO "CenterUser" ("id", "centerId", "userId", "role", "status", "createdAt")
SELECT gen_random_uuid(), cv."id", rod."id", CAST('OWNER' AS "CenterUserRole"), CAST('ACTIVO' AS "MemberStatus"), NOW()
FROM cv, rod
ON CONFLICT ("centerId", "userId") DO UPDATE
SET "role" = CAST('OWNER' AS "CenterUserRole"),
    "status" = CAST('ACTIVO' AS "MemberStatus");

INSERT INTO "CenterUser" ("id", "centerId", "userId", "role", "status", "createdAt")
SELECT gen_random_uuid(), felimor."id", fra."id", CAST('OWNER' AS "CenterUserRole"), CAST('ACTIVO' AS "MemberStatus"), NOW()
FROM felimor, fra
ON CONFLICT ("centerId", "userId") DO UPDATE
SET "role" = CAST('OWNER' AS "CenterUserRole"),
    "status" = CAST('ACTIVO' AS "MemberStatus");

INSERT INTO "CenterUser" ("id", "centerId", "userId", "role", "status", "createdAt")
SELECT gen_random_uuid(), felimor."id", fel."id", CAST('OWNER' AS "CenterUserRole"), CAST('ACTIVO' AS "MemberStatus"), NOW()
FROM felimor, fel
ON CONFLICT ("centerId", "userId") DO UPDATE
SET "role" = CAST('OWNER' AS "CenterUserRole"),
    "status" = CAST('ACTIVO' AS "MemberStatus");

INSERT INTO "CenterUser" ("id", "centerId", "userId", "role", "status", "createdAt")
SELECT gen_random_uuid(), felimor."id", juan."id", CAST('MEMBER' AS "CenterUserRole"), CAST('ACTIVO' AS "MemberStatus"), NOW()
FROM felimor, juan
ON CONFLICT ("centerId", "userId") DO UPDATE
SET "role" = CAST('MEMBER' AS "CenterUserRole"),
    "status" = CAST('ACTIVO' AS "MemberStatus");
