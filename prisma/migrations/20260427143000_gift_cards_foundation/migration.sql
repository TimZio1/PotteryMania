-- Gift cards foundation

CREATE TABLE "gift_card_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "bg_color" TEXT,
    "text_color" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_card_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gift_card_templates_studio_id_is_active_idx"
ON "gift_card_templates"("studio_id", "is_active");

ALTER TABLE "gift_card_templates"
ADD CONSTRAINT "gift_card_templates_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gift_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_id" UUID,
    "original_value_cents" INTEGER NOT NULL,
    "remaining_value_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "purchaser_user_id" UUID,
    "purchaser_name" TEXT,
    "purchaser_email" TEXT,
    "recipient_name" TEXT,
    "recipient_email" TEXT,
    "personal_message" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "issued_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gift_cards_code_key"
ON "gift_cards"("code");

CREATE UNIQUE INDEX "gift_cards_stripe_checkout_session_id_key"
ON "gift_cards"("stripe_checkout_session_id");

CREATE INDEX "gift_cards_studio_id_is_active_idx"
ON "gift_cards"("studio_id", "is_active");

CREATE INDEX "gift_cards_template_id_idx"
ON "gift_cards"("template_id");

CREATE INDEX "gift_cards_purchaser_user_id_idx"
ON "gift_cards"("purchaser_user_id");

CREATE INDEX "gift_cards_recipient_email_idx"
ON "gift_cards"("recipient_email");

ALTER TABLE "gift_cards"
ADD CONSTRAINT "gift_cards_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gift_cards"
ADD CONSTRAINT "gift_cards_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "gift_card_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gift_cards"
ADD CONSTRAINT "gift_cards_purchaser_user_id_fkey"
FOREIGN KEY ("purchaser_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "gift_card_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gift_card_id" UUID NOT NULL,
    "order_id" UUID,
    "booking_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "redeemed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gift_card_redemptions_gift_card_id_idx"
ON "gift_card_redemptions"("gift_card_id");

CREATE INDEX "gift_card_redemptions_order_id_idx"
ON "gift_card_redemptions"("order_id");

CREATE INDEX "gift_card_redemptions_booking_id_idx"
ON "gift_card_redemptions"("booking_id");

CREATE INDEX "gift_card_redemptions_redeemed_by_user_id_idx"
ON "gift_card_redemptions"("redeemed_by_user_id");

ALTER TABLE "gift_card_redemptions"
ADD CONSTRAINT "gift_card_redemptions_gift_card_id_fkey"
FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gift_card_redemptions"
ADD CONSTRAINT "gift_card_redemptions_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gift_card_redemptions"
ADD CONSTRAINT "gift_card_redemptions_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gift_card_redemptions"
ADD CONSTRAINT "gift_card_redemptions_redeemed_by_user_id_fkey"
FOREIGN KEY ("redeemed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
