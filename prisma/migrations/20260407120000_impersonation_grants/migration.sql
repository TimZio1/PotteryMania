-- CreateTable
CREATE TABLE "impersonation_grants" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonation_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_grants_admin_user_id_idx" ON "impersonation_grants"("admin_user_id");
