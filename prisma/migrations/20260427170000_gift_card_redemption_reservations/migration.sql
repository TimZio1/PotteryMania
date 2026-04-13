-- Gift card redemption reservations

DO $$
BEGIN
    CREATE TYPE "GiftCardRedemptionState" AS ENUM (
        'reserved',
        'finalized',
        'released'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "gift_card_redemptions"
ADD COLUMN IF NOT EXISTS "redemption_state" "GiftCardRedemptionState" NOT NULL DEFAULT 'reserved',
ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" TEXT,
ADD COLUMN IF NOT EXISTS "reserved_until" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "gift_card_redemptions_stripe_checkout_session_id_idx"
ON "gift_card_redemptions"("stripe_checkout_session_id");

CREATE INDEX IF NOT EXISTS "gift_card_redemptions_redemption_state_reserved_until_idx"
ON "gift_card_redemptions"("redemption_state", "reserved_until");
