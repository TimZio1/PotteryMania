-- Class packages: define package catalog, purchases, and usage tracking.
CREATE TYPE "PackagePurchaseStatus" AS ENUM ('active', 'expired', 'cancelled', 'fully_used');

CREATE TABLE "class_packages" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validity_days" INTEGER NOT NULL,
    "general_item_limit" INTEGER,
    "max_sets_for_sale" INTEGER,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "auto_refund_on_cancel" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "class_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_package_items" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "class_package_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_package_purchases" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "credits_total" INTEGER NOT NULL,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "paid_cents" INTEGER NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "status" "PackagePurchaseStatus" NOT NULL DEFAULT 'active',
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "class_package_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_package_usages" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "credits_used" INTEGER NOT NULL DEFAULT 1,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "class_package_usages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bookings"
ADD COLUMN "class_package_purchase_id" UUID;

ALTER TABLE "cart_items"
ADD COLUMN "class_package_purchase_id" UUID;

CREATE INDEX "class_packages_studio_id_is_visible_is_active_created_at_idx"
ON "class_packages"("studio_id", "is_visible", "is_active", "created_at");

CREATE UNIQUE INDEX "class_package_items_package_id_experience_id_key"
ON "class_package_items"("package_id", "experience_id");

CREATE INDEX "class_package_items_experience_id_idx"
ON "class_package_items"("experience_id");

CREATE INDEX "class_package_purchases_user_id_status_expires_at_idx"
ON "class_package_purchases"("user_id", "status", "expires_at");

CREATE UNIQUE INDEX "class_package_usages_purchase_id_booking_id_key"
ON "class_package_usages"("purchase_id", "booking_id");

CREATE INDEX "class_package_usages_booking_id_idx"
ON "class_package_usages"("booking_id");

CREATE INDEX "class_package_usages_experience_id_idx"
ON "class_package_usages"("experience_id");

ALTER TABLE "class_packages"
ADD CONSTRAINT "class_packages_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_items"
ADD CONSTRAINT "class_package_items_package_id_fkey"
FOREIGN KEY ("package_id") REFERENCES "class_packages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_items"
ADD CONSTRAINT "class_package_items_experience_id_fkey"
FOREIGN KEY ("experience_id") REFERENCES "experiences"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_purchases"
ADD CONSTRAINT "class_package_purchases_package_id_fkey"
FOREIGN KEY ("package_id") REFERENCES "class_packages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_purchases"
ADD CONSTRAINT "class_package_purchases_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_usages"
ADD CONSTRAINT "class_package_usages_purchase_id_fkey"
FOREIGN KEY ("purchase_id") REFERENCES "class_package_purchases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_usages"
ADD CONSTRAINT "class_package_usages_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_package_usages"
ADD CONSTRAINT "class_package_usages_experience_id_fkey"
FOREIGN KEY ("experience_id") REFERENCES "experiences"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_class_package_purchase_id_fkey"
FOREIGN KEY ("class_package_purchase_id") REFERENCES "class_package_purchases"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_class_package_purchase_id_fkey"
FOREIGN KEY ("class_package_purchase_id") REFERENCES "class_package_purchases"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
