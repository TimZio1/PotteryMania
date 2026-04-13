-- AlterEnum: BookingPaymentStatus — add pay_at_studio
ALTER TYPE "BookingPaymentStatus" ADD VALUE 'pay_at_studio';

-- AlterTable: Experience — booking cutoff + pay-at-studio
ALTER TABLE "experiences" ADD COLUMN "booking_cutoff_hours" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "experiences" ADD COLUMN "allow_pay_at_studio" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Studio — WhatsApp + opening hours
ALTER TABLE "studios" ADD COLUMN "whatsapp_number" TEXT;
ALTER TABLE "studios" ADD COLUMN "opening_hours" JSONB;
