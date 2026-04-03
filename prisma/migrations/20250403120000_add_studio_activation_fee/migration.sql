-- Add studio activation fee columns
ALTER TABLE "studios" ADD COLUMN "activation_paid_at" TIMESTAMP(3);
ALTER TABLE "studios" ADD COLUMN "activation_session_id" TEXT;
