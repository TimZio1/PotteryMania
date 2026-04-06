-- P3-A: Monetized AI insights (templates, generated rows, purchases, action log)

CREATE TYPE "InsightTemplateCategory" AS ENUM (
    'pricing',
    'schedule',
    'demand',
    'retention',
    'revenue',
    'capacity',
    'feature_rec'
);

CREATE TYPE "InsightComplexity" AS ENUM ('simple', 'medium', 'advanced');

CREATE TYPE "GeneratedInsightStatus" AS ENUM (
    'generated',
    'viewed',
    'purchased',
    'expired',
    'dismissed'
);

CREATE TYPE "InsightActionType" AS ENUM (
    'applied',
    'dismissed',
    'viewed_editor',
    'deferred'
);

CREATE TABLE "insight_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "category" "InsightTemplateCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "preview_text" TEXT NOT NULL,
    "analysis_prompt" TEXT NOT NULL DEFAULT '',
    "base_price_cents" INTEGER NOT NULL,
    "complexity" "InsightComplexity" NOT NULL DEFAULT 'simple',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insight_templates_slug_key" ON "insight_templates"("slug");

CREATE TABLE "generated_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "preview_title" TEXT NOT NULL,
    "preview_hook" TEXT NOT NULL,
    "potential_benefit" TEXT NOT NULL DEFAULT '',
    "price_cents" INTEGER NOT NULL,
    "full_analysis" JSONB,
    "status" "GeneratedInsightStatus" NOT NULL DEFAULT 'generated',
    "confidence_score" DOUBLE PRECISION,
    "benchmark_sample_size" INTEGER,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "purchased_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "generated_insights_studio_id_idx" ON "generated_insights"("studio_id");

CREATE INDEX "generated_insights_template_id_idx" ON "generated_insights"("template_id");

ALTER TABLE "generated_insights" ADD CONSTRAINT "generated_insights_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "generated_insights" ADD CONSTRAINT "generated_insights_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "insight_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "insight_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "insight_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insight_purchases_insight_id_key" ON "insight_purchases"("insight_id");

CREATE INDEX "insight_purchases_studio_id_idx" ON "insight_purchases"("studio_id");

ALTER TABLE "insight_purchases" ADD CONSTRAINT "insight_purchases_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "generated_insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insight_purchases" ADD CONSTRAINT "insight_purchases_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insight_purchases" ADD CONSTRAINT "insight_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "insight_action_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "insight_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "action_type" "InsightActionType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "insight_action_logs_insight_id_idx" ON "insight_action_logs"("insight_id");

ALTER TABLE "insight_action_logs" ADD CONSTRAINT "insight_action_logs_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "generated_insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "insight_action_logs" ADD CONSTRAINT "insight_action_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
