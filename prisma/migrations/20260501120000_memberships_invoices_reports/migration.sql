ALTER TABLE "studios"
  ADD COLUMN "daily_report_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "daily_report_time" TEXT DEFAULT '08:00';

ALTER TABLE "experiences"
  ADD COLUMN "tax_rate_bps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD COLUMN "membership_purchase_id" UUID;

CREATE TABLE "memberships" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "duration_days" INTEGER NOT NULL,
  "sessions_per_period" INTEGER,
  "max_future_bookings" INTEGER,
  "price_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "recurring_price_cents" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_experiences" (
  "id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "experience_id" UUID NOT NULL,
  CONSTRAINT "membership_experiences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_purchases" (
  "id" UUID NOT NULL,
  "membership_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "sessions_used" INTEGER NOT NULL DEFAULT 0,
  "paid_cents" INTEGER NOT NULL,
  "stripe_subscription_id" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "membership_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "booking_id" UUID,
  "order_id" UUID,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_address" TEXT,
  "subtotal_cents" INTEGER NOT NULL,
  "tax_cents" INTEGER NOT NULL DEFAULT 0,
  "total_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "line_items" JSONB NOT NULL,
  "pdf_url" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_experiences_membership_id_experience_id_key" ON "membership_experiences"("membership_id", "experience_id");
CREATE INDEX "membership_experiences_experience_id_idx" ON "membership_experiences"("experience_id");
CREATE INDEX "memberships_studio_id_is_visible_is_active_sort_order_idx" ON "memberships"("studio_id", "is_visible", "is_active", "sort_order");
CREATE INDEX "membership_purchases_user_id_status_idx" ON "membership_purchases"("user_id", "status");
CREATE INDEX "membership_purchases_membership_id_status_idx" ON "membership_purchases"("membership_id", "status");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_studio_id_created_at_idx" ON "invoices"("studio_id", "created_at");
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");
CREATE INDEX "bookings_membership_purchase_id_idx" ON "bookings"("membership_purchase_id");

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_experiences"
  ADD CONSTRAINT "membership_experiences_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "membership_experiences_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_purchases"
  ADD CONSTRAINT "membership_purchases_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "membership_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_membership_purchase_id_fkey" FOREIGN KEY ("membership_purchase_id") REFERENCES "membership_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
