-- Prevent duplicate coupon redemptions for the same paid order (race-safe at DB layer).
CREATE UNIQUE INDEX IF NOT EXISTS "discount_redemptions_coupon_id_order_id_key"
ON "discount_redemptions" ("coupon_id", "order_id")
WHERE "order_id" IS NOT NULL;
