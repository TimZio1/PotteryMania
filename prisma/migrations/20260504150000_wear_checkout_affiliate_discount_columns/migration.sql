-- Idempotent hotfix for production schema drift in wear checkout / affiliate discounts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponChannel') THEN
    CREATE TYPE "CouponChannel" AS ENUM ('general', 'wear_only', 'marketplace_only');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WearCouponDiscountMode') THEN
    CREATE TYPE "WearCouponDiscountMode" AS ENUM ('standard', 'bundle');
  END IF;
END
$$;

ALTER TABLE "wear_orders"
  ADD COLUMN IF NOT EXISTS "studio_id" UUID,
  ADD COLUMN IF NOT EXISTS "coupon_id" UUID,
  ADD COLUMN IF NOT EXISTS "pre_discount_subtotal_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "discount_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "studio_margin_cents" INTEGER,
  ADD COLUMN IF NOT EXISTS "platform_revenue_cents" INTEGER;

ALTER TABLE "discount_redemptions"
  ADD COLUMN IF NOT EXISTS "wear_order_id" UUID;

ALTER TABLE "coupons"
  ADD COLUMN IF NOT EXISTS "channel" "CouponChannel" NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS "wear_discount_mode" "WearCouponDiscountMode" NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS "bundle_buy" INTEGER,
  ADD COLUMN IF NOT EXISTS "bundle_get" INTEGER,
  ADD COLUMN IF NOT EXISTS "bundle_applies_to" TEXT,
  ADD COLUMN IF NOT EXISTS "wear_applies_to" TEXT,
  ADD COLUMN IF NOT EXISTS "wear_product_ids" JSONB,
  ADD COLUMN IF NOT EXISTS "stackable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "affiliate_commission_bps_override" INTEGER;

CREATE INDEX IF NOT EXISTS "wear_orders_studio_id_created_at_idx"
  ON "wear_orders"("studio_id", "created_at");

CREATE INDEX IF NOT EXISTS "discount_redemptions_wear_order_id_idx"
  ON "discount_redemptions"("wear_order_id");

CREATE UNIQUE INDEX IF NOT EXISTS "discount_redemptions_wear_order_id_key"
  ON "discount_redemptions"("wear_order_id")
  WHERE "wear_order_id" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wear_orders_studio_id_fkey'
  ) THEN
    ALTER TABLE "wear_orders"
      ADD CONSTRAINT "wear_orders_studio_id_fkey"
      FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wear_orders_coupon_id_fkey'
  ) THEN
    ALTER TABLE "wear_orders"
      ADD CONSTRAINT "wear_orders_coupon_id_fkey"
      FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_redemptions_wear_order_id_fkey'
  ) THEN
    ALTER TABLE "discount_redemptions"
      ADD CONSTRAINT "discount_redemptions_wear_order_id_fkey"
      FOREIGN KEY ("wear_order_id") REFERENCES "wear_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
