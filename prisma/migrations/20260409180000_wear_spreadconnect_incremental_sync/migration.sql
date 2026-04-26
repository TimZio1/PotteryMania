-- Incremental Spreadconnect catalog sync: stable article id + content fingerprint
ALTER TABLE IF EXISTS "wear_products" ADD COLUMN IF NOT EXISTS "spreadconnect_article_id" INTEGER;
ALTER TABLE IF EXISTS "wear_products" ADD COLUMN IF NOT EXISTS "spreadconnect_catalog_fingerprint" VARCHAR(64);

DO $$
BEGIN
  IF to_regclass('public.wear_products') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "wear_products_spreadconnect_article_id_key" ON "wear_products"("spreadconnect_article_id");
  END IF;
END
$$;
