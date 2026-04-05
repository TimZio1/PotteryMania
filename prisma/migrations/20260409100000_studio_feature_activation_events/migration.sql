-- CreateEnum
CREATE TYPE "StudioFeatureActivationEventKind" AS ENUM (
  'vendor_enable',
  'vendor_disable',
  'admin_active',
  'admin_inactive',
  'admin_override_price',
  'checkout_single',
  'checkout_bundle',
  'stripe_subscription_ended'
);

-- CreateTable
CREATE TABLE "studio_feature_activation_events" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "kind" "StudioFeatureActivationEventKind" NOT NULL,
    "stripe_subscription_id" TEXT,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_feature_activation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_feature_activation_events_feature_id_created_at_idx" ON "studio_feature_activation_events"("feature_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_feature_activation_events_created_at_idx" ON "studio_feature_activation_events"("created_at");

-- AddForeignKey
ALTER TABLE "studio_feature_activation_events" ADD CONSTRAINT "studio_feature_activation_events_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_feature_activation_events" ADD CONSTRAINT "studio_feature_activation_events_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "platform_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
