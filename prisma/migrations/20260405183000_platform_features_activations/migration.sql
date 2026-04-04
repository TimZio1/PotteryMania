-- CreateEnum
CREATE TYPE "PlatformFeatureVisibility" AS ENUM ('public', 'hidden', 'beta');

-- CreateEnum
CREATE TYPE "StudioFeatureActivationStatus" AS ENUM ('inactive', 'active', 'trialing', 'pending_cancel');

-- CreateTable
CREATE TABLE "platform_features" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'addons',
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "PlatformFeatureVisibility" NOT NULL DEFAULT 'public',
    "grant_by_default" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_feature_activations" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "status" "StudioFeatureActivationStatus" NOT NULL DEFAULT 'inactive',
    "trial_ends_at" TIMESTAMP(3),
    "deactivates_at" TIMESTAMP(3),
    "stripe_subscription_item_id" TEXT,
    "override_price_cents" INTEGER,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_feature_activations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_features_slug_key" ON "platform_features"("slug");

CREATE INDEX "platform_features_is_active_idx" ON "platform_features"("is_active");

CREATE UNIQUE INDEX "studio_feature_activations_studio_id_feature_id_key" ON "studio_feature_activations"("studio_id", "feature_id");

CREATE INDEX "studio_feature_activations_studio_id_idx" ON "studio_feature_activations"("studio_id");

CREATE INDEX "studio_feature_activations_feature_id_idx" ON "studio_feature_activations"("feature_id");

ALTER TABLE "studio_feature_activations" ADD CONSTRAINT "studio_feature_activations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_feature_activations" ADD CONSTRAINT "studio_feature_activations_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "platform_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed catalog (slugs align with legacy studio_feature_requests.feature_key)
INSERT INTO "platform_features" ("id", "slug", "name", "description", "category", "price_cents", "currency", "is_active", "visibility", "grant_by_default", "sort_order", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'reschedule_bookings', 'Guest rescheduling', 'Let customers change dates without losing the sale.', 'addons', 130, 'EUR', true, 'public', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'waitlist_system', 'Waitlist', 'Capture demand when classes are full.', 'addons', 200, 'EUR', true, 'public', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'advanced_analytics', 'Advanced analytics', 'Deeper trends on classes, revenue, and occupancy.', 'addons', 400, 'EUR', true, 'public', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'automated_reminders', 'Automated reminders', 'Fewer no-shows with email reminders before class.', 'addons', 300, 'EUR', true, 'public', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'online_shop', 'Online shop', 'Sell pottery and supplies alongside classes.', 'addons', 800, 'EUR', true, 'public', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'kiln_tracking', 'Kiln & production', 'Track firings and student pieces in one place.', 'addons', 600, 'EUR', true, 'public', true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'staff_management', 'Staff & roles', 'Delegate access to instructors and assistants.', 'addons', 500, 'EUR', true, 'public', true, 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Copy prior studio preferences into activations (one row per legacy request)
INSERT INTO "studio_feature_activations" ("id", "studio_id", "feature_id", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), sfr."studio_id", pf."id",
  CASE WHEN sfr."desired_on" THEN 'active'::"StudioFeatureActivationStatus" ELSE 'inactive'::"StudioFeatureActivationStatus" END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "studio_feature_requests" sfr
INNER JOIN "platform_features" pf ON pf."slug" = sfr."feature_key";
