ALTER TYPE "CartItemType" ADD VALUE IF NOT EXISTS 'wear';
ALTER TYPE "OrderItemType" ADD VALUE IF NOT EXISTS 'wear';

ALTER TABLE IF EXISTS "cart_items"
ADD COLUMN IF NOT EXISTS "wear_product_id" UUID,
ADD COLUMN IF NOT EXISTS "wear_product_variant_id" UUID;

CREATE INDEX IF NOT EXISTS "cart_items_wear_product_id_idx"
ON "cart_items"("wear_product_id");

CREATE INDEX IF NOT EXISTS "cart_items_wear_product_variant_id_idx"
ON "cart_items"("wear_product_variant_id");

ALTER TABLE IF EXISTS "order_items"
ADD COLUMN IF NOT EXISTS "wear_product_id" UUID,
ADD COLUMN IF NOT EXISTS "wear_product_variant_id" UUID;

CREATE INDEX IF NOT EXISTS "order_items_wear_product_id_idx"
ON "order_items"("wear_product_id");

CREATE INDEX IF NOT EXISTS "order_items_wear_product_variant_id_idx"
ON "order_items"("wear_product_variant_id");

ALTER TABLE IF EXISTS "payments"
ADD COLUMN IF NOT EXISTS "provider_account_id" TEXT;

ALTER TABLE IF EXISTS "wear_orders"
ADD COLUMN IF NOT EXISTS "order_id" UUID,
ADD COLUMN IF NOT EXISTS "shipping_cents" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.wear_products') IS NOT NULL AND to_regclass('public.wear_product_variants') IS NOT NULL THEN
    ALTER TABLE "cart_items"
      ADD CONSTRAINT "cart_items_wear_product_id_fkey"
      FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "cart_items"
      ADD CONSTRAINT "cart_items_wear_product_variant_id_fkey"
      FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_wear_product_id_fkey"
      FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_wear_product_variant_id_fkey"
      FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.wear_orders') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "wear_orders_order_id_key"
    ON "wear_orders"("order_id");
    CREATE INDEX IF NOT EXISTS "wear_orders_order_id_idx"
    ON "wear_orders"("order_id");
    ALTER TABLE "wear_orders"
      ADD CONSTRAINT "wear_orders_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
