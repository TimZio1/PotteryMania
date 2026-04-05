-- Prompt 4-A: StudioRankingScore, RankingBoost, FeaturedPlacement

CREATE TYPE "RankingBoostType" AS ENUM ('featured', 'seasonal', 'manual', 'paid');

CREATE TYPE "FeaturedPlacementSlot" AS ENUM ('homepage_hero', 'category_top', 'trending', 'seasonal');

CREATE TABLE "studio_ranking_scores" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "performance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manual_boost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "composite_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentile_rank" INTEGER NOT NULL DEFAULT 0,
    "score_breakdown" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_ranking_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_ranking_scores_studio_id_key" ON "studio_ranking_scores"("studio_id");

CREATE INDEX "studio_ranking_scores_composite_score_idx" ON "studio_ranking_scores"("composite_score" DESC);

ALTER TABLE "studio_ranking_scores" ADD CONSTRAINT "studio_ranking_scores_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ranking_boosts" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "boost_type" "RankingBoostType" NOT NULL,
    "boost_value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_boosts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ranking_boosts_studio_id_idx" ON "ranking_boosts"("studio_id");

CREATE INDEX "ranking_boosts_starts_at_ends_at_idx" ON "ranking_boosts"("starts_at", "ends_at");

ALTER TABLE "ranking_boosts" ADD CONSTRAINT "ranking_boosts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ranking_boosts" ADD CONSTRAINT "ranking_boosts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "featured_placements" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "placement_slot" "FeaturedPlacementSlot" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_placements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "featured_placements_placement_slot_is_active_sort_order_idx" ON "featured_placements"("placement_slot", "is_active", "sort_order");

CREATE INDEX "featured_placements_studio_id_idx" ON "featured_placements"("studio_id");

ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
