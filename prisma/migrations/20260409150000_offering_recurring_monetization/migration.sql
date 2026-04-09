-- Recurring monetization model for products/experiences and customer subscriptions.

CREATE TYPE "OfferingPricingType" AS ENUM ('one_time', 'recurring');
CREATE TYPE "OfferingBillingInterval" AS ENUM ('weekly', 'monthly', 'custom');
CREATE TYPE "OfferingFailedPaymentAction" AS ENUM ('pause', 'cancel');
CREATE TYPE "OfferingSubscriptionTargetType" AS ENUM ('product', 'experience', 'kiln_usage', 'membership');
CREATE TYPE "OfferingSubscriptionStatus" AS ENUM (
  'active',
  'trialing',
  'past_due',
  'paused',
  'pending_cancel',
  'canceled',
  'expired'
);
CREATE TYPE "OfferingSubscriptionEventType" AS ENUM (
  'created',
  'checkout_completed',
  'renewed',
  'payment_failed',
  'payment_recovered',
  'paused',
  'resumed',
  'cancel_scheduled',
  'canceled',
  'expired',
  'plan_changed'
);

ALTER TABLE "products"
  ADD COLUMN "pricing_type" "OfferingPricingType" NOT NULL DEFAULT 'one_time',
  ADD COLUMN "recurring_price_cents" INTEGER,
  ADD COLUMN "billing_interval" "OfferingBillingInterval",
  ADD COLUMN "billing_interval_count" INTEGER,
  ADD COLUMN "minimum_commitment_cycles" INTEGER,
  ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "trial_period_days" INTEGER,
  ADD COLUMN "cancellation_policy_text" TEXT,
  ADD COLUMN "grace_period_days" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "payment_retry_max" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "failed_payment_action" "OfferingFailedPaymentAction" NOT NULL DEFAULT 'pause',
  ADD COLUMN "pricing_version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "experiences"
  ADD COLUMN "pricing_type" "OfferingPricingType" NOT NULL DEFAULT 'one_time',
  ADD COLUMN "recurring_price_cents" INTEGER,
  ADD COLUMN "billing_interval" "OfferingBillingInterval",
  ADD COLUMN "billing_interval_count" INTEGER,
  ADD COLUMN "minimum_commitment_cycles" INTEGER,
  ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "trial_period_days" INTEGER,
  ADD COLUMN "cancellation_policy_text" TEXT,
  ADD COLUMN "grace_period_days" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "payment_retry_max" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "failed_payment_action" "OfferingFailedPaymentAction" NOT NULL DEFAULT 'pause',
  ADD COLUMN "pricing_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "offering_subscriptions" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "user_id" UUID,
  "target_type" "OfferingSubscriptionTargetType" NOT NULL,
  "product_id" UUID,
  "experience_id" UUID,
  "customer_email" TEXT NOT NULL,
  "customer_name" TEXT,
  "status" "OfferingSubscriptionStatus" NOT NULL DEFAULT 'active',
  "price_snapshot_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "pricing_version" INTEGER NOT NULL DEFAULT 1,
  "billing_interval" "OfferingBillingInterval" NOT NULL,
  "billing_interval_count" INTEGER NOT NULL DEFAULT 1,
  "minimum_commitment_cycles" INTEGER,
  "cycles_billed" INTEGER NOT NULL DEFAULT 0,
  "auto_renew" BOOLEAN NOT NULL DEFAULT TRUE,
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
  "trial_ends_at" TIMESTAMP(3),
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "next_billing_date" TIMESTAMP(3),
  "grace_ends_at" TIMESTAMP(3),
  "failed_payment_count" INTEGER NOT NULL DEFAULT 0,
  "payment_retry_max" INTEGER NOT NULL DEFAULT 3,
  "grace_period_days" INTEGER NOT NULL DEFAULT 3,
  "failed_payment_action" "OfferingFailedPaymentAction" NOT NULL DEFAULT 'pause',
  "canceled_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "offering_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "offering_subscription_events" (
  "id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "event_type" "OfferingSubscriptionEventType" NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "offering_subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offering_subscriptions_stripe_subscription_id_key" ON "offering_subscriptions"("stripe_subscription_id");
CREATE INDEX "offering_subscriptions_studio_id_status_idx" ON "offering_subscriptions"("studio_id", "status");
CREATE INDEX "offering_subscriptions_user_id_status_idx" ON "offering_subscriptions"("user_id", "status");
CREATE INDEX "offering_subscriptions_product_id_idx" ON "offering_subscriptions"("product_id");
CREATE INDEX "offering_subscriptions_experience_id_idx" ON "offering_subscriptions"("experience_id");
CREATE INDEX "offering_subscriptions_stripe_subscription_id_idx" ON "offering_subscriptions"("stripe_subscription_id");

CREATE INDEX "offering_subscription_events_subscription_id_created_at_idx"
  ON "offering_subscription_events"("subscription_id", "created_at");

ALTER TABLE "offering_subscriptions"
  ADD CONSTRAINT "offering_subscriptions_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "offering_subscriptions"
  ADD CONSTRAINT "offering_subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "offering_subscriptions"
  ADD CONSTRAINT "offering_subscriptions_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "offering_subscriptions"
  ADD CONSTRAINT "offering_subscriptions_experience_id_fkey"
  FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "offering_subscription_events"
  ADD CONSTRAINT "offering_subscription_events_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "offering_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
