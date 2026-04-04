ALTER TABLE "users"
  ADD COLUMN "last_login_at" TIMESTAMP(3),
  ADD COLUMN "suspended_at" TIMESTAMP(3),
  ADD COLUMN "suspended_reason" TEXT;

CREATE TABLE "admin_notes" (
  "id" UUID NOT NULL,
  "author_user_id" UUID,
  "target_user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_notes_target_user_id_created_at_idx"
  ON "admin_notes"("target_user_id", "created_at");

ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
