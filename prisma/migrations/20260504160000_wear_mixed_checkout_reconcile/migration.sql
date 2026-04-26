-- Reconcile wear columns/constraints that older out-of-order migrations skipped on fresh databases.

ALTER TABLE "wear_products"
  ADD COLUMN IF NOT EXISTS "spreadconnect_article_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "spreadconnect_catalog_fingerprint" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "wear_products_spreadconnect_article_id_key"
  ON "wear_products"("spreadconnect_article_id");

ALTER TABLE "cart_items"
  ADD COLUMN IF NOT EXISTS "wear_product_id" UUID,
  ADD COLUMN IF NOT EXISTS "wear_product_variant_id" UUID;

CREATE INDEX IF NOT EXISTS "cart_items_wear_product_id_idx"
  ON "cart_items"("wear_product_id");

CREATE INDEX IF NOT EXISTS "cart_items_wear_product_variant_id_idx"
  ON "cart_items"("wear_product_variant_id");

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "wear_product_id" UUID,
  ADD COLUMN IF NOT EXISTS "wear_product_variant_id" UUID;

CREATE INDEX IF NOT EXISTS "order_items_wear_product_id_idx"
  ON "order_items"("wear_product_id");

CREATE INDEX IF NOT EXISTS "order_items_wear_product_variant_id_idx"
  ON "order_items"("wear_product_variant_id");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "provider_account_id" TEXT;

ALTER TABLE "wear_orders"
  ADD COLUMN IF NOT EXISTS "order_id" UUID,
  ADD COLUMN IF NOT EXISTS "shipping_cents" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "wear_orders_order_id_key"
  ON "wear_orders"("order_id");

CREATE INDEX IF NOT EXISTS "wear_orders_order_id_idx"
  ON "wear_orders"("order_id");

DO $$ BEGIN
  ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_wear_product_id_fkey"
    FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cart_items"
    ADD CONSTRAINT "cart_items_wear_product_variant_id_fkey"
    FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_wear_product_id_fkey"
    FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_wear_product_variant_id_fkey"
    FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "wear_orders"
    ADD CONSTRAINT "wear_orders_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
