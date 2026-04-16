ALTER TYPE "CartItemType" ADD VALUE IF NOT EXISTS 'wear';
ALTER TYPE "OrderItemType" ADD VALUE IF NOT EXISTS 'wear';

ALTER TABLE "cart_items"
ADD COLUMN "wear_product_id" UUID,
ADD COLUMN "wear_product_variant_id" UUID;

CREATE INDEX "cart_items_wear_product_id_idx"
ON "cart_items"("wear_product_id");

CREATE INDEX "cart_items_wear_product_variant_id_idx"
ON "cart_items"("wear_product_variant_id");

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_wear_product_id_fkey"
FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_wear_product_variant_id_fkey"
FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items"
ADD COLUMN "wear_product_id" UUID,
ADD COLUMN "wear_product_variant_id" UUID;

CREATE INDEX "order_items_wear_product_id_idx"
ON "order_items"("wear_product_id");

CREATE INDEX "order_items_wear_product_variant_id_idx"
ON "order_items"("wear_product_variant_id");

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_wear_product_id_fkey"
FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_wear_product_variant_id_fkey"
FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD COLUMN "provider_account_id" TEXT;

ALTER TABLE "wear_orders"
ADD COLUMN "order_id" UUID,
ADD COLUMN "shipping_cents" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "wear_orders_order_id_key"
ON "wear_orders"("order_id");

CREATE INDEX "wear_orders_order_id_idx"
ON "wear_orders"("order_id");

ALTER TABLE "wear_orders"
ADD CONSTRAINT "wear_orders_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
