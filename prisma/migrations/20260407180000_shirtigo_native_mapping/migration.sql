-- No-op migration placeholder.
-- This directory existed without migration.sql and blocked `prisma migrate deploy` (P3015).
-- Prisma/Postgres reject a migration with zero executable statements ("empty query").
SELECT 1;
