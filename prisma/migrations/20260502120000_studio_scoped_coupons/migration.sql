-- Studio-scoped coupon support + per-customer/minimum-subtotal controls.
ALTER TABLE "coupons"
  ADD COLUMN "studio_id" UUID,
  ADD COLUMN "max_per_customer" INTEGER,
  ADD COLUMN "min_subtotal_cents" INTEGER;

ALTER TABLE "coupons"
  ADD CONSTRAINT "coupons_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "coupons_studio_id_is_active_idx"
ON "coupons"("studio_id", "is_active");
