-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('active', 'notified', 'converted', 'cancelled');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'awaiting_vendor_approval';

-- AlterEnum
ALTER TYPE "BookingPaymentStatus" ADD VALUE 'partial';

-- AlterTable
ALTER TABLE "experiences" ADD COLUMN "booking_deposit_bps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "experiences" ADD COLUMN "booking_approval_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "experiences" ADD COLUMN "waitlist_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN "seat_type" TEXT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "ticket_ref" TEXT;
ALTER TABLE "bookings" ADD COLUMN "deposit_amount_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN "remaining_balance_cents" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing bookings (pre-deposit schema: full amount was always the checkout target)
UPDATE "bookings"
SET
  "deposit_amount_cents" = "total_amount_cents",
  "remaining_balance_cents" = 0
WHERE "payment_status" IN ('paid', 'refunded', 'partially_refunded');

UPDATE "bookings"
SET
  "deposit_amount_cents" = 0,
  "remaining_balance_cents" = "total_amount_cents"
WHERE "payment_status" = 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "bookings_ticket_ref_key" ON "bookings"("ticket_ref");

-- CreateTable
CREATE TABLE "booking_waitlist_entries" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "customer_user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "seat_type" TEXT,
    "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_studio_id_idx" ON "booking_waitlist_entries"("studio_id");

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_slot_id_idx" ON "booking_waitlist_entries"("slot_id");

-- CreateIndex
CREATE INDEX "booking_waitlist_entries_experience_id_idx" ON "booking_waitlist_entries"("experience_id");

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_waitlist_entries" ADD CONSTRAINT "booking_waitlist_entries_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
