-- Experience: let studios offer a "pay full now" option alongside deposits.
ALTER TABLE "experiences"
ADD COLUMN "allow_full_payment_option" BOOLEAN NOT NULL DEFAULT false;

-- Booking: persist deposit/remainder lifecycle metadata.
ALTER TABLE "bookings"
ADD COLUMN "deposit_paid_at" TIMESTAMP(3),
ADD COLUMN "remainder_paid_at" TIMESTAMP(3),
ADD COLUMN "remainder_payment_link" TEXT;

-- Cart item: remember whether the customer chose deposit-only or full payment for a booking line.
CREATE TYPE "BookingPaymentPreference" AS ENUM ('deposit', 'full');

ALTER TABLE "cart_items"
ADD COLUMN "booking_payment_preference" "BookingPaymentPreference";
