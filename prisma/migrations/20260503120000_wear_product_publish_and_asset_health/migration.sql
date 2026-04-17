-- Align wear_products with schema.prisma (publish + asset health); was added in code without a migration.

CREATE TYPE "WearCatalogPublishStatus" AS ENUM ('draft', 'published', 'hidden');

CREATE TYPE "WearAssetHealthStatus" AS ENUM ('pending', 'ready', 'invalid');

ALTER TABLE "wear_products"
ADD COLUMN "publish_status" "WearCatalogPublishStatus" NOT NULL DEFAULT 'published',
ADD COLUMN "asset_health_status" "WearAssetHealthStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "asset_health_message" TEXT;
