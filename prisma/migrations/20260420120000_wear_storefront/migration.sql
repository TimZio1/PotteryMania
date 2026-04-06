-- CreateEnum
CREATE TYPE "WearOrderStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "wear_products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "images" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "external_fulfillment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wear_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wear_orders" (
    "id" UUID NOT NULL,
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "status" "WearOrderStatus" NOT NULL DEFAULT 'pending',
    "subtotal_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wear_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wear_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "wear_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,

    CONSTRAINT "wear_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wear_products_slug_key" ON "wear_products"("slug");

-- CreateIndex
CREATE INDEX "wear_products_is_active_sort_order_idx" ON "wear_products"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "wear_orders_stripe_checkout_session_id_key" ON "wear_orders"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "wear_orders_status_created_at_idx" ON "wear_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "wear_order_items_order_id_idx" ON "wear_order_items"("order_id");

-- AddForeignKey
ALTER TABLE "wear_order_items" ADD CONSTRAINT "wear_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "wear_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wear_order_items" ADD CONSTRAINT "wear_order_items_wear_product_id_fkey" FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
