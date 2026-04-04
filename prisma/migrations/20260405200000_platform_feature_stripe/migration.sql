-- AlterTable
ALTER TABLE "platform_features" ADD COLUMN "stripe_price_id" TEXT;

-- AlterTable
ALTER TABLE "studios" ADD COLUMN "stripe_platform_customer_id" TEXT;

-- AlterTable
ALTER TABLE "studio_feature_activations" ADD COLUMN "stripe_subscription_id" TEXT;

-- CreateIndex
CREATE INDEX "studio_feature_activations_stripe_subscription_id_idx" ON "studio_feature_activations"("stripe_subscription_id");
