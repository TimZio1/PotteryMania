ALTER TABLE "early_access_signups"
ADD COLUMN "country" TEXT;

UPDATE "early_access_signups"
SET "country" = 'Greece'
WHERE "country" IS NULL;

ALTER TABLE "early_access_signups"
ALTER COLUMN "country" SET NOT NULL;
