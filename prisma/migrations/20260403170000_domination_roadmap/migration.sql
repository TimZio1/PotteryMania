-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'cancelled');

-- CreateEnum
CREATE TYPE "ReviewTargetType" AS ENUM ('product', 'studio', 'experience');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "reminder_scheduled_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "carts" ADD COLUMN "last_recovery_email_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "calendar_connections" ADD COLUMN "access_token" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN "refresh_token" TEXT;
ALTER TABLE "calendar_connections" ADD COLUMN "token_expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "orders" ADD COLUMN "tracking_carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "tracking_number" TEXT;
ALTER TABLE "orders" ADD COLUMN "tracking_url" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_method" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_rate_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "tax_cents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "stripe_checkout_session_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "order_confirmation_sent_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "vendor_notification_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "product_id" UUID,
    "experience_id" UUID,
    "booking_id" UUID,
    "order_item_id" UUID,
    "target_type" "ReviewTargetType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_invites" (
    "id" UUID NOT NULL,
    "inviter_studio_id" UUID NOT NULL,
    "accepted_studio_id" UUID,
    "invite_code" TEXT NOT NULL,
    "invite_email" TEXT,
    "invite_url" TEXT,
    "invite_status" TEXT NOT NULL DEFAULT 'pending',
    "reward_note" TEXT,
    "invited_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rate_quotes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "destination_country" TEXT NOT NULL,
    "destination_city" TEXT,
    "subtotal_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL,
    "method_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_rate_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_studio_id_created_at_idx" ON "reviews"("studio_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_product_id_created_at_idx" ON "reviews"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_experience_id_created_at_idx" ON "reviews"("experience_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "referral_invites_invite_code_key" ON "referral_invites"("invite_code");

-- CreateIndex
CREATE INDEX "referral_invites_inviter_studio_id_created_at_idx" ON "referral_invites"("inviter_studio_id", "created_at");

-- CreateIndex
CREATE INDEX "shipping_rate_quotes_studio_id_created_at_idx" ON "shipping_rate_quotes"("studio_id", "created_at");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_invites" ADD CONSTRAINT "referral_invites_inviter_studio_id_fkey" FOREIGN KEY ("inviter_studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_invites" ADD CONSTRAINT "referral_invites_accepted_studio_id_fkey" FOREIGN KEY ("accepted_studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rate_quotes" ADD CONSTRAINT "shipping_rate_quotes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rate_quotes" ADD CONSTRAINT "shipping_rate_quotes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
