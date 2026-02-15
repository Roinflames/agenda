-- Ajusta el rol de Francisca Beltran en el centro Felimor a STAFF.
-- Idempotente: solo modifica filas que no esten ya en STAFF.
UPDATE "CenterUser" cu
SET "role" = CAST('STAFF' AS "CenterUserRole")
FROM "User" u, "Center" c
WHERE cu."userId" = u."id"
  AND cu."centerId" = c."id"
  AND lower(u."email") = 'francisca.beltran@example.com'
  AND (
    lower(c."slug") LIKE 'felimor%'
    OR lower(c."name") LIKE '%felimor%'
  )
  AND cu."role" <> CAST('STAFF' AS "CenterUserRole");
