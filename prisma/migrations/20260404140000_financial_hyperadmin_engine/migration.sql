-- Financial Hyperadmin Engine: ledger, snapshots, alerts, billing primitives

CREATE TYPE "FinanceLedgerEntryType" AS ENUM (
  'gross_revenue', 'discount', 'refund', 'stripe_fee', 'tax', 'platform_commission',
  'vendor_payout', 'activation_fee', 'infra_cost', 'email_cost', 'ai_cost',
  'storage_cost', 'manual_adjustment'
);

CREATE TYPE "FinanceLedgerDirection" AS ENUM ('credit', 'debit');

CREATE TYPE "FinancialSnapshotScopeType" AS ENUM (
  'platform', 'user', 'studio', 'plan', 'feature', 'country', 'cohort'
);

CREATE TYPE "FinancialAlertSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "FinancialAlertStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'dismissed');

CREATE TYPE "FinancialRecommendationImpact" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "FinancialRecommendationDifficulty" AS ENUM ('trivial', 'easy', 'medium', 'hard');
CREATE TYPE "FinancialRecommendationStatus" AS ENUM ('suggested', 'accepted', 'rejected', 'implemented');

CREATE TYPE "ProviderSyncRunStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

CREATE TYPE "BillingPlanInterval" AS ENUM ('month', 'year');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
CREATE TYPE "SubscriptionEventType" AS ENUM (
  'created', 'renewed', 'upgraded', 'downgraded', 'canceled', 'payment_failed', 'payment_succeeded'
);

CREATE TYPE "PriceChangeEntityType" AS ENUM ('product', 'experience', 'billing_plan');

CREATE TABLE "billing_plans" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "interval" "BillingPlanInterval" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_plans_slug_key" ON "billing_plans"("slug");

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
  "stripe_subscription_id" TEXT,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "canceled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "finance_ledger_entries" (
  "id" UUID NOT NULL,
  "entry_date" DATE NOT NULL,
  "entry_type" "FinanceLedgerEntryType" NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "direction" "FinanceLedgerDirection" NOT NULL,
  "source_system" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "dedupe_key" TEXT,
  "user_id" UUID,
  "studio_id" UUID,
  "order_id" UUID,
  "booking_id" UUID,
  "subscription_id" UUID,
  "plan_id" UUID,
  "country" TEXT,
  "feature_key" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finance_ledger_entries_dedupe_key_key" ON "finance_ledger_entries"("dedupe_key");
CREATE INDEX "finance_ledger_entries_entry_date_idx" ON "finance_ledger_entries"("entry_date");
CREATE INDEX "finance_ledger_entries_entry_type_entry_date_idx" ON "finance_ledger_entries"("entry_type", "entry_date");
CREATE INDEX "finance_ledger_entries_user_id_entry_date_idx" ON "finance_ledger_entries"("user_id", "entry_date");
CREATE INDEX "finance_ledger_entries_studio_id_entry_date_idx" ON "finance_ledger_entries"("studio_id", "entry_date");
CREATE INDEX "finance_ledger_entries_order_id_idx" ON "finance_ledger_entries"("order_id");
CREATE INDEX "finance_ledger_entries_booking_id_idx" ON "finance_ledger_entries"("booking_id");

ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_ledger_entries" ADD CONSTRAINT "finance_ledger_entries_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "financial_snapshot_daily" (
  "id" UUID NOT NULL,
  "snapshot_date" DATE NOT NULL,
  "scope_type" "FinancialSnapshotScopeType" NOT NULL,
  "scope_id" TEXT NOT NULL DEFAULT '',
  "revenue_cents" INTEGER NOT NULL DEFAULT 0,
  "cost_cents" INTEGER NOT NULL DEFAULT 0,
  "profit_cents" INTEGER NOT NULL DEFAULT 0,
  "margin_bps" INTEGER,
  "metrics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_snapshot_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_snapshot_daily_snapshot_date_scope_type_scope_id_key"
  ON "financial_snapshot_daily"("snapshot_date", "scope_type", "scope_id");
CREATE INDEX "financial_snapshot_daily_scope_type_scope_id_snapshot_date_idx"
  ON "financial_snapshot_daily"("scope_type", "scope_id", "snapshot_date");

CREATE TABLE "feature_usage_facts" (
  "id" UUID NOT NULL,
  "event_date" DATE NOT NULL,
  "feature_key" TEXT NOT NULL,
  "event_name" TEXT NOT NULL,
  "user_id" UUID,
  "studio_id" UUID,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "cost_cents" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feature_usage_facts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_usage_facts_feature_key_event_date_idx" ON "feature_usage_facts"("feature_key", "event_date");
CREATE INDEX "feature_usage_facts_event_date_feature_key_event_name_idx" ON "feature_usage_facts"("event_date", "feature_key", "event_name");

ALTER TABLE "feature_usage_facts" ADD CONSTRAINT "feature_usage_facts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feature_usage_facts" ADD CONSTRAINT "feature_usage_facts_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "financial_alerts" (
  "id" UUID NOT NULL,
  "alert_type" TEXT NOT NULL,
  "severity" "FinancialAlertSeverity" NOT NULL,
  "status" "FinancialAlertStatus" NOT NULL DEFAULT 'open',
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scope_type" TEXT,
  "scope_id" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "why_it_matters" TEXT NOT NULL,
  "likely_cause" TEXT,
  "recommended_action" TEXT NOT NULL,
  "metrics" JSONB,
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_alerts_dedupe_key_key" ON "financial_alerts"("dedupe_key");
CREATE INDEX "financial_alerts_status_severity_idx" ON "financial_alerts"("status", "severity");
CREATE INDEX "financial_alerts_detected_at_idx" ON "financial_alerts"("detected_at");

CREATE TABLE "financial_recommendations" (
  "id" UUID NOT NULL,
  "recommendation_type" TEXT NOT NULL,
  "impact_level" "FinancialRecommendationImpact" NOT NULL,
  "difficulty" "FinancialRecommendationDifficulty" NOT NULL,
  "status" "FinancialRecommendationStatus" NOT NULL DEFAULT 'suggested',
  "scope_type" TEXT,
  "scope_id" TEXT,
  "title" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "suggested_action" TEXT NOT NULL,
  "estimated_gain_cents" INTEGER,
  "confidence_score" INTEGER NOT NULL DEFAULT 50,
  "metrics" JSONB,
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_recommendations_dedupe_key_key" ON "financial_recommendations"("dedupe_key");
CREATE INDEX "financial_recommendations_status_idx" ON "financial_recommendations"("status");

CREATE TABLE "pricing_scenarios" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "inputs" JSONB NOT NULL,
  "outputs" JSONB,
  "created_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pricing_scenarios_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pricing_scenarios" ADD CONSTRAINT "pricing_scenarios_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "provider_sync_runs" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "run_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "run_ended_at" TIMESTAMP(3),
  "status" "ProviderSyncRunStatus" NOT NULL DEFAULT 'pending',
  "cursor" TEXT,
  "rows_processed" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_sync_runs_provider_run_started_at_idx" ON "provider_sync_runs"("provider", "run_started_at");

CREATE TABLE "plan_feature_entitlements" (
  "id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "feature_key" TEXT NOT NULL,
  "limit_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plan_feature_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_feature_entitlements_plan_id_feature_key_key" ON "plan_feature_entitlements"("plan_id", "feature_key");

ALTER TABLE "plan_feature_entitlements" ADD CONSTRAINT "plan_feature_entitlements_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "subscription_events" (
  "id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "event_type" "SubscriptionEventType" NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_events_subscription_id_created_at_idx" ON "subscription_events"("subscription_id", "created_at");

ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "coupons" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "percent_off" INTEGER,
  "amount_off_cents" INTEGER,
  "currency" TEXT DEFAULT 'EUR',
  "max_redemptions" INTEGER,
  "redeemed_count" INTEGER NOT NULL DEFAULT 0,
  "valid_from" TIMESTAMP(3),
  "valid_until" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

CREATE TABLE "discount_redemptions" (
  "id" UUID NOT NULL,
  "coupon_id" UUID NOT NULL,
  "order_id" UUID,
  "user_id" UUID,
  "amount_cents" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discount_redemptions_coupon_id_idx" ON "discount_redemptions"("coupon_id");

ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "price_change_history" (
  "id" UUID NOT NULL,
  "entity_type" "PriceChangeEntityType" NOT NULL,
  "entity_id" UUID NOT NULL,
  "old_price_cents" INTEGER,
  "new_price_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "changed_by_id" UUID,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_change_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "price_change_history_entity_type_created_at_idx" ON "price_change_history"("entity_type", "created_at");
CREATE INDEX "price_change_history_entity_type_entity_id_idx" ON "price_change_history"("entity_type", "entity_id");

ALTER TABLE "price_change_history" ADD CONSTRAINT "price_change_history_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "admin_audit_logs" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "before_json" JSONB,
  "after_json" JSONB,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_entity_type_created_at_idx" ON "admin_audit_logs"("entity_type", "created_at");

ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "acquisition_attributions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "referrer" TEXT,
  "landing_path" TEXT,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "acquisition_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "acquisition_attributions_user_id_key" ON "acquisition_attributions"("user_id");

ALTER TABLE "acquisition_attributions" ADD CONSTRAINT "acquisition_attributions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
