-- Default wear studio margin / affiliate commission: 15% (1500 bps) for new configs.
ALTER TABLE "studio_wear_configs" ALTER COLUMN "margin_bps" SET DEFAULT 1500;

-- Align existing affiliate short-code rows with the public 15% promise (was 10% or 20% defaults).
UPDATE "studio_wear_configs"
SET "margin_bps" = 1500
WHERE "wear_affiliate_code" IS NOT NULL
  AND "margin_bps" IN (1000, 2000);
