-- Create studio_wear_configs if it does not exist (model was added without a migration).
CREATE TABLE IF NOT EXISTS "studio_wear_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "margin_bps" INTEGER NOT NULL DEFAULT 2000,
    "margin_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_wear_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "studio_wear_configs_studio_id_key" ON "studio_wear_configs"("studio_id");

-- FK is conditional so this migration can be re-applied after `migrate resolve` if the table already exists.
DO $studio_wear_configs_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'studio_wear_configs'
      AND c.conname = 'studio_wear_configs_studio_id_fkey'
  ) THEN
    ALTER TABLE "studio_wear_configs"
    ADD CONSTRAINT "studio_wear_configs_studio_id_fkey"
    FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $studio_wear_configs_fk$;

-- Short public link per studio: /w/{wear_affiliate_code} → wear shop + ref
ALTER TABLE "studio_wear_configs" ADD COLUMN IF NOT EXISTS "wear_affiliate_code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "studio_wear_configs_wear_affiliate_code_key" ON "studio_wear_configs"("wear_affiliate_code");
