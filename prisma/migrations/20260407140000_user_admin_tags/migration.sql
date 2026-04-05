-- AlterTable
ALTER TABLE "users" ADD COLUMN "admin_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "users_admin_tags_idx" ON "users" USING GIN ("admin_tags");
