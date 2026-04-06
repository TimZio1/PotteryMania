-- CreateEnum
CREATE TYPE "BusinessTemplateFunnelEventType" AS ENUM ('gallery_view', 'drawer_open', 'activate_click', 'activation_success');

-- CreateTable
CREATE TABLE "business_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "business_model_label" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_platform_recommended" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "visual_theme" TEXT NOT NULL DEFAULT 'amber',
    "new_setup_summary" TEXT NOT NULL,
    "current_setup_summary" TEXT NOT NULL,
    "what_will_change" JSONB NOT NULL,
    "expected_impact" JSONB NOT NULL,
    "success_goal_phrase" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_template_funnel_events" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "template_slug" TEXT,
    "event_type" "BusinessTemplateFunnelEventType" NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_template_funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_template_activation_logs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "previous_slug" TEXT,
    "previous_activated_at" TIMESTAMP(3),
    "new_slug" TEXT NOT NULL,
    "new_activated_at" TIMESTAMP(3) NOT NULL,
    "previous_snapshot" JSONB,
    "new_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_template_activation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_templates_slug_key" ON "business_templates"("slug");

-- CreateIndex
CREATE INDEX "business_templates_is_visible_sort_order_idx" ON "business_templates"("is_visible", "sort_order");

-- CreateIndex
CREATE INDEX "business_template_funnel_events_studio_id_created_at_idx" ON "business_template_funnel_events"("studio_id", "created_at");

-- CreateIndex
CREATE INDEX "business_template_funnel_events_template_slug_idx" ON "business_template_funnel_events"("template_slug");

-- CreateIndex
CREATE INDEX "business_template_funnel_events_event_type_created_at_idx" ON "business_template_funnel_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "business_template_activation_logs_studio_id_created_at_idx" ON "business_template_activation_logs"("studio_id", "created_at");

-- AddForeignKey
ALTER TABLE "business_template_funnel_events" ADD CONSTRAINT "business_template_funnel_events_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_template_activation_logs" ADD CONSTRAINT "business_template_activation_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
