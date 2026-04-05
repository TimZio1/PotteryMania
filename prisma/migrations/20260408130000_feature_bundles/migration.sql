-- CreateTable
CREATE TABLE "feature_bundles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_bundle_items" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "feature_bundle_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_bundles_slug_key" ON "feature_bundles"("slug");

CREATE INDEX "feature_bundles_is_active_idx" ON "feature_bundles"("is_active");

CREATE UNIQUE INDEX "feature_bundle_items_bundle_id_feature_id_key" ON "feature_bundle_items"("bundle_id", "feature_id");

CREATE INDEX "feature_bundle_items_bundle_id_idx" ON "feature_bundle_items"("bundle_id");

CREATE INDEX "feature_bundle_items_feature_id_idx" ON "feature_bundle_items"("feature_id");

ALTER TABLE "feature_bundle_items" ADD CONSTRAINT "feature_bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "feature_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feature_bundle_items" ADD CONSTRAINT "feature_bundle_items_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "platform_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
