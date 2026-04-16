-- Wear builder queue (draft-first Spreadconnect catalog builder); worker wired incrementally.

CREATE TYPE "WearBuilderJobState" AS ENUM (
  'queued',
  'validating',
  'uploading_design',
  'creating_article',
  'syncing',
  'draft_ready',
  'failed',
  'published',
  'cancelled'
);

CREATE TABLE "wear_builder_jobs" (
  "id" UUID NOT NULL,
  "state" "WearBuilderJobState" NOT NULL DEFAULT 'queued',
  "design_image_url" TEXT,
  "article_creation_payload" JSONB,
  "spreadconnect_design_id" TEXT,
  "spreadconnect_article_id" INTEGER,
  "wear_product_id" UUID,
  "error_message" TEXT,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wear_builder_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wear_builder_jobs_state_created_at_idx" ON "wear_builder_jobs"("state", "created_at" ASC);

ALTER TABLE "wear_builder_jobs" ADD CONSTRAINT "wear_builder_jobs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "wear_builder_jobs" ADD CONSTRAINT "wear_builder_jobs_wear_product_id_fkey" FOREIGN KEY ("wear_product_id") REFERENCES "wear_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
