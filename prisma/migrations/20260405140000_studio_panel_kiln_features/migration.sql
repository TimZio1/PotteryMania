-- CreateEnum
CREATE TYPE "KilnFiringStatus" AS ENUM ('draft', 'loading', 'firing', 'cooling', 'complete');

-- CreateTable
CREATE TABLE "kiln_firings" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "label" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "status" "KilnFiringStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiln_firings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiln_items" (
    "id" UUID NOT NULL,
    "firing_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiln_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_feature_requests" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "feature_key" TEXT NOT NULL,
    "desired_on" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kiln_firings_studio_id_created_at_idx" ON "kiln_firings"("studio_id", "created_at");

-- CreateIndex
CREATE INDEX "kiln_items_firing_id_idx" ON "kiln_items"("firing_id");

-- CreateIndex
CREATE INDEX "studio_feature_requests_studio_id_idx" ON "studio_feature_requests"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_feature_requests_studio_id_feature_key_key" ON "studio_feature_requests"("studio_id", "feature_key");

-- AddForeignKey
ALTER TABLE "kiln_firings" ADD CONSTRAINT "kiln_firings_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiln_items" ADD CONSTRAINT "kiln_items_firing_id_fkey" FOREIGN KEY ("firing_id") REFERENCES "kiln_firings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_feature_requests" ADD CONSTRAINT "studio_feature_requests_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
