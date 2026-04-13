CREATE TYPE "LoyaltyTransactionType" AS ENUM ('earned_from_booking', 'redeemed_for_gift_card', 'admin_adjustment', 'expired');

ALTER TABLE "experiences"
ADD COLUMN "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "loyalty_configs" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loyalty_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loyalty_balances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "points_balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loyalty_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL,
    "balance_id" UUID NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "booking_id" UUID,
    "gift_card_id" UUID,
    "admin_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_client_fields" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "field_type" "IntakeFieldType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "studio_client_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_client_field_responses" (
    "id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "studio_client_field_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loyalty_configs_studio_id_key" ON "loyalty_configs"("studio_id");
CREATE UNIQUE INDEX "loyalty_balances_user_id_studio_id_key" ON "loyalty_balances"("user_id", "studio_id");
CREATE INDEX "loyalty_balances_studio_id_idx" ON "loyalty_balances"("studio_id");
CREATE INDEX "loyalty_transactions_booking_id_idx" ON "loyalty_transactions"("booking_id");
CREATE INDEX "loyalty_transactions_gift_card_id_idx" ON "loyalty_transactions"("gift_card_id");
CREATE INDEX "loyalty_transactions_admin_user_id_idx" ON "loyalty_transactions"("admin_user_id");
CREATE INDEX "loyalty_transactions_type_created_at_idx" ON "loyalty_transactions"("type", "created_at");
CREATE INDEX "studio_client_fields_studio_id_sort_order_idx" ON "studio_client_fields"("studio_id", "sort_order");
CREATE UNIQUE INDEX "studio_client_field_responses_field_id_user_id_key" ON "studio_client_field_responses"("field_id", "user_id");
CREATE INDEX "studio_client_field_responses_user_id_idx" ON "studio_client_field_responses"("user_id");

ALTER TABLE "loyalty_configs"
ADD CONSTRAINT "loyalty_configs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_balances"
ADD CONSTRAINT "loyalty_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_balances"
ADD CONSTRAINT "loyalty_balances_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "loyalty_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "studio_client_fields"
ADD CONSTRAINT "studio_client_fields_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_client_field_responses"
ADD CONSTRAINT "studio_client_field_responses_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "studio_client_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_client_field_responses"
ADD CONSTRAINT "studio_client_field_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
