-- AlterTable
ALTER TABLE "studio_feature_activation_events" ADD COLUMN "stripe_checkout_session_id" TEXT;

-- UniqueComposite: one ledger row per catalog feature per Checkout Session (webhook idempotency)
CREATE UNIQUE INDEX "studio_feature_activation_events_feature_checkout_session_key"
ON "studio_feature_activation_events" ("feature_id", "stripe_checkout_session_id");
