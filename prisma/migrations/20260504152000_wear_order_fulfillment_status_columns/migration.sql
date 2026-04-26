-- Idempotent hotfix for remaining wear order fulfillment columns expected by Prisma.

ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'manual_review';
ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'in_production';
ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'fulfilled';
ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'shipped';
ALTER TYPE "WearOrderStatus" ADD VALUE IF NOT EXISTS 'refunded';

ALTER TABLE "wear_orders"
  ADD COLUMN IF NOT EXISTS "fulfillment_status_detail" TEXT,
  ADD COLUMN IF NOT EXISTS "fulfillment_last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "fulfillment_last_attempt_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "fulfillment_succeeded_at" TIMESTAMP(3);
