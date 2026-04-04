-- AlterTable
ALTER TABLE "studios" ADD COLUMN "marketplace_rank_weight" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "studios_marketplace_rank_weight_idx" ON "studios"("marketplace_rank_weight");
