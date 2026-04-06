-- AlterTable
ALTER TABLE "wear_products" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "wear_products" ADD COLUMN "archived_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "wear_product_variants" (
    "id" UUID NOT NULL,
    "wear_product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "option_size" TEXT,
    "option_color" TEXT,
    "price_cents" INTEGER,
    "stock_quantity" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wear_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wear_product_variants_wear_product_id_sort_order_idx" ON "wear_product_variants"("wear_product_id", "sort_order");

-- AddForeignKey
ALTER TABLE "wear_product_variants" ADD CONSTRAINT "wear_product_variants_wear_product_id_fkey" FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "wear_orders" ADD COLUMN "amount_total_cents" INTEGER;

-- AlterTable
ALTER TABLE "wear_order_items" ADD COLUMN "wear_product_variant_id" UUID;
ALTER TABLE "wear_order_items" ADD COLUMN "variant_label_snapshot" TEXT;

-- AddForeignKey
ALTER TABLE "wear_order_items" ADD CONSTRAINT "wear_order_items_wear_product_variant_id_fkey" FOREIGN KEY ("wear_product_variant_id") REFERENCES "wear_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "wear_products_archived_at_idx" ON "wear_products"("archived_at");

-- CreateTable
CREATE TABLE "wear_analytics_events" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "order_id" UUID,
    "payload" JSONB,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wear_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wear_analytics_events_kind_created_at_idx" ON "wear_analytics_events"("kind", "created_at");
CREATE INDEX "wear_analytics_events_product_id_created_at_idx" ON "wear_analytics_events"("product_id", "created_at");
CREATE INDEX "wear_analytics_events_order_id_idx" ON "wear_analytics_events"("order_id");
