-- AlterTable
ALTER TABLE "vendor_domains" ADD COLUMN "verification_token" TEXT;

CREATE UNIQUE INDEX "vendor_domains_verification_token_key" ON "vendor_domains"("verification_token");
