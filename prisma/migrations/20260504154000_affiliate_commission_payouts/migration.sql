DO $$ BEGIN
  CREATE TYPE "AffiliateCommissionCreditStatus" AS ENUM ('pending', 'payout_pending', 'paid', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "affiliate_payouts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studio_id" UUID NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'pending',
  "stripe_account_id" TEXT NOT NULL,
  "stripe_transfer_id" TEXT,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliate_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "affiliate_commission_credits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "studio_id" UUID NOT NULL,
  "wear_order_id" UUID NOT NULL,
  "payout_id" UUID,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "AffiliateCommissionCreditStatus" NOT NULL DEFAULT 'pending',
  "source_stripe_payment_id" TEXT,
  "credited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "affiliate_commission_credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_payouts_stripe_transfer_id_key"
  ON "affiliate_payouts"("stripe_transfer_id");

CREATE INDEX IF NOT EXISTS "affiliate_payouts_studio_id_status_currency_idx"
  ON "affiliate_payouts"("studio_id", "status", "currency");

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_commission_credits_wear_order_id_key"
  ON "affiliate_commission_credits"("wear_order_id");

CREATE INDEX IF NOT EXISTS "affiliate_commission_credits_studio_id_status_currency_idx"
  ON "affiliate_commission_credits"("studio_id", "status", "currency");

CREATE INDEX IF NOT EXISTS "affiliate_commission_credits_payout_id_idx"
  ON "affiliate_commission_credits"("payout_id");

DO $$ BEGIN
  ALTER TABLE "affiliate_payouts"
    ADD CONSTRAINT "affiliate_payouts_studio_id_fkey"
    FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "affiliate_commission_credits"
    ADD CONSTRAINT "affiliate_commission_credits_studio_id_fkey"
    FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "affiliate_commission_credits"
    ADD CONSTRAINT "affiliate_commission_credits_wear_order_id_fkey"
    FOREIGN KEY ("wear_order_id") REFERENCES "wear_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "affiliate_commission_credits"
    ADD CONSTRAINT "affiliate_commission_credits_payout_id_fkey"
    FOREIGN KEY ("payout_id") REFERENCES "affiliate_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
