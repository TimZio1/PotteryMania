-- Wear order lifecycle: new statuses and fulfillment fields.

ALTER TYPE "WearOrderStatus" ADD VALUE 'in_production';
ALTER TYPE "WearOrderStatus" ADD VALUE 'fulfilled';
ALTER TYPE "WearOrderStatus" ADD VALUE 'shipped';
ALTER TYPE "WearOrderStatus" ADD VALUE 'refunded';

ALTER TABLE "wear_orders" ADD COLUMN "paid_at" TIMESTAMP(3),
ADD COLUMN "fulfilled_at" TIMESTAMP(3),
ADD COLUMN "shipped_at" TIMESTAMP(3),
ADD COLUMN "cancelled_at" TIMESTAMP(3),
ADD COLUMN "refunded_at" TIMESTAMP(3),
ADD COLUMN "fulfillment_provider" TEXT,
ADD COLUMN "tracking_number" TEXT,
ADD COLUMN "internal_notes" TEXT,
ADD COLUMN "external_fulfillment_ref" TEXT;

UPDATE "wear_orders" SET "paid_at" = "updated_at" WHERE "status" = 'paid' AND "paid_at" IS NULL;
UPDATE "wear_orders" SET "cancelled_at" = "updated_at" WHERE "status" = 'cancelled' AND "cancelled_at" IS NULL;
