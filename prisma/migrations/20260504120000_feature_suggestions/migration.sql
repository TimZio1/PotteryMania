-- Feature suggestions submitted from the public /suggest-feature form.
CREATE TABLE "feature_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "body" TEXT NOT NULL,
    "submitter_email" TEXT,
    "submitter_name" TEXT,
    "user_id" UUID,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_suggestions_created_at_idx" ON "feature_suggestions"("created_at");

CREATE INDEX "feature_suggestions_status_idx" ON "feature_suggestions"("status");

ALTER TABLE "feature_suggestions" ADD CONSTRAINT "feature_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
