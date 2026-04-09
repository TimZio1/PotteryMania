DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('ShippingZone')) THEN
    CREATE TYPE "ShippingZone" AS ENUM ('domestic', 'europe', 'usa', 'canada', 'asia');
  END IF;
END$$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "preferred_language" TEXT,
  ADD COLUMN IF NOT EXISTS "detected_region" "ShippingZone",
  ADD COLUMN IF NOT EXISTS "region_override" "ShippingZone";

ALTER TABLE "studios"
  ADD COLUMN IF NOT EXISTS "supported_languages" TEXT[] DEFAULT ARRAY['en']::TEXT[];

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "shipping_domestic_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "shipping_europe_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "shipping_usa_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "shipping_canada_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "shipping_asia_cents" INTEGER;

CREATE TABLE IF NOT EXISTS "product_translations" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "language_code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "short_description" TEXT,
  "full_description" TEXT,
  "materials" TEXT,
  "care_instructions" TEXT,
  "shipping_notes" TEXT,
  "return_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_translations_product_id_language_code_key"
  ON "product_translations"("product_id", "language_code");
CREATE INDEX IF NOT EXISTS "product_translations_language_code_idx"
  ON "product_translations"("language_code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'product_translations_product_id_fkey'
  ) THEN
    ALTER TABLE "product_translations"
      ADD CONSTRAINT "product_translations_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "studio_translations" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "language_code" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "short_description" TEXT,
  "long_description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "studio_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "studio_translations_studio_id_language_code_key"
  ON "studio_translations"("studio_id", "language_code");
CREATE INDEX IF NOT EXISTS "studio_translations_language_code_idx"
  ON "studio_translations"("language_code");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'studio_translations_studio_id_fkey'
  ) THEN
    ALTER TABLE "studio_translations"
      ADD CONSTRAINT "studio_translations_studio_id_fkey"
      FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
