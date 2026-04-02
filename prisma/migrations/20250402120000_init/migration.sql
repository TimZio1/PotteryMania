-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'vendor', 'admin', 'hyper_admin');

-- CreateEnum
CREATE TYPE "StudioStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ProductStockStatus" AS ENUM ('in_stock', 'out_of_stock', 'backorder');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('one_time_event', 'workshop', 'masterclass', 'recurring_class', 'open_session', 'private_session');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('studio_address', 'custom_address', 'online_future');

-- CreateEnum
CREATE TYPE "ExperienceStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ExperienceVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "CancellationPolicyType" AS ENUM ('non_refundable', 'refundable_until_hours', 'partial_refund_until_hours', 'custom');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('one_time', 'recurring_weekly', 'recurring_custom_days', 'manually_added_dates', 'flexible_window');

-- CreateEnum
CREATE TYPE "BookingSlotStatus" AS ENUM ('open', 'full', 'blocked', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancellation_requested', 'cancelled_by_customer', 'cancelled_by_vendor', 'cancelled_by_admin', 'completed', 'refunded', 'partially_refunded', 'no_show');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('product', 'booking');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('product', 'booking');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "StripeOnboardingStatus" AS ENUM ('pending', 'connected', 'restricted', 'disconnected');

-- CreateEnum
CREATE TYPE "CommissionRuleScope" AS ENUM ('global', 'vendor');

-- CreateEnum
CREATE TYPE "CommissionItemType" AS ENUM ('product', 'booking');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('google', 'apple_ics');

-- CreateEnum
CREATE TYPE "CalendarConnectionStatus" AS ENUM ('pending', 'connected', 'error', 'disconnected');

-- CreateEnum
CREATE TYPE "CalendarSyncAction" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "CalendarSyncResult" AS ENUM ('success', 'error');

-- CreateEnum
CREATE TYPE "VendorDomainType" AS ENUM ('subdomain', 'custom');

-- CreateEnum
CREATE TYPE "DomainVerificationStatus" AS ENUM ('pending', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('pending', 'active', 'failed');

-- CreateEnum
CREATE TYPE "AnalyticsSnapshotScope" AS ENUM ('platform', 'studio');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "preferred_language" TEXT,
    "preferred_currency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "legal_business_name" TEXT NOT NULL,
    "vat_number" TEXT NOT NULL,
    "responsible_person_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "postal_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "short_description" TEXT,
    "long_description" TEXT,
    "logo_url" TEXT,
    "cover_image_url" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "website_url" TEXT,
    "preferred_language" TEXT,
    "preferred_currency" TEXT,
    "status" "StudioStatus" NOT NULL,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "category_id" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "full_description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "sale_price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sku" TEXT,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "stock_status" "ProductStockStatus" NOT NULL,
    "materials" TEXT,
    "care_instructions" TEXT,
    "weight_grams" INTEGER,
    "dimensions_text" TEXT,
    "shipping_notes" TEXT,
    "return_notes" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "full_description" TEXT,
    "experience_type" "ExperienceType" NOT NULL,
    "category" TEXT,
    "skill_level" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "minimum_participants" INTEGER NOT NULL,
    "maximum_participants" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "compare_at_price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "what_is_included" TEXT,
    "what_to_bring" TEXT,
    "requirements" TEXT,
    "restrictions" TEXT,
    "age_restriction_note" TEXT,
    "accessibility_note" TEXT,
    "cover_image_url" TEXT,
    "location_type" "LocationType" NOT NULL,
    "venue_name" TEXT,
    "address_line_1" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "cancellation_policy_id" UUID,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExperienceStatus" NOT NULL,
    "visibility" "ExperienceVisibility" NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_images" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_policies" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "name" TEXT NOT NULL,
    "policy_type" "CancellationPolicyType" NOT NULL,
    "hours_before_start" INTEGER,
    "refund_percentage" INTEGER,
    "custom_policy_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "schedule_type" "ScheduleType" NOT NULL,
    "recurrence_start_date" DATE,
    "recurrence_end_date" DATE,
    "weekdays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "start_time" TEXT,
    "end_time" TEXT,
    "capacity_per_slot" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slots" (
    "id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "recurring_rule_id" UUID,
    "slot_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "capacity_total" INTEGER NOT NULL,
    "capacity_reserved" INTEGER NOT NULL DEFAULT 0,
    "status" "BookingSlotStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "customer_user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "participant_count" INTEGER NOT NULL,
    "booking_status" "BookingStatus" NOT NULL,
    "payment_status" "BookingPaymentStatus" NOT NULL,
    "total_amount_cents" INTEGER NOT NULL,
    "commission_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "vendor_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "cancellation_policy_snapshot" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_cancellations" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "cancelled_by_role" TEXT NOT NULL,
    "cancelled_by_user_id" UUID,
    "cancellation_reason" TEXT,
    "refund_outcome" TEXT,
    "refund_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reschedules" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "original_slot_id" UUID NOT NULL,
    "new_slot_id" UUID NOT NULL,
    "rescheduled_by_role" TEXT NOT NULL,
    "rescheduled_by_user_id" UUID,
    "reschedule_reason" TEXT,
    "change_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reschedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "session_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "item_type" "CartItemType" NOT NULL,
    "product_id" UUID,
    "experience_id" UUID,
    "slot_id" UUID,
    "vendor_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "participant_count" INTEGER,
    "price_snapshot_cents" INTEGER NOT NULL,
    "policy_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "customer_user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "shipping_address_json" JSONB,
    "billing_address_json" JSONB,
    "notes" TEXT,
    "order_status" "OrderStatus" NOT NULL,
    "payment_status" "OrderPaymentStatus" NOT NULL,
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_type" "OrderItemType" NOT NULL,
    "product_id" UUID,
    "booking_id" UUID,
    "vendor_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "participant_count" INTEGER,
    "price_snapshot_cents" INTEGER NOT NULL,
    "commission_snapshot_cents" INTEGER NOT NULL DEFAULT 0,
    "vendor_amount_snapshot_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "payment_status" "PaymentRecordStatus" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_accounts" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "stripe_account_id" TEXT NOT NULL,
    "onboarding_status" "StripeOnboardingStatus" NOT NULL,
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "details_submitted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "rule_scope" "CommissionRuleScope" NOT NULL,
    "item_type" "CommissionItemType" NOT NULL,
    "percentage_basis_points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_configs" (
    "id" UUID NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "connection_status" "CalendarConnectionStatus" NOT NULL,
    "external_calendar_id" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "sync_error_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_logs" (
    "id" UUID NOT NULL,
    "calendar_connection_id" UUID NOT NULL,
    "booking_id" UUID,
    "action_type" "CalendarSyncAction" NOT NULL,
    "status" "CalendarSyncResult" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_domains" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "domain_type" "VendorDomainType" NOT NULL,
    "domain_name" TEXT NOT NULL,
    "verification_status" "DomainVerificationStatus" NOT NULL,
    "ssl_status" "SslStatus" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "flag_key" TEXT NOT NULL,
    "flag_value" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL,
    "snapshot_scope" "AnalyticsSnapshotScope" NOT NULL,
    "studio_id" UUID,
    "snapshot_date" DATE NOT NULL,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_audit_log" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "actor_role" TEXT,
    "actor_user_id" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "customer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "studios_status_idx" ON "studios"("status");

-- CreateIndex
CREATE INDEX "studios_country_city_idx" ON "studios"("country", "city");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE INDEX "products_studio_id_idx" ON "products"("studio_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "products_studio_id_slug_key" ON "products"("studio_id", "slug");

-- CreateIndex
CREATE INDEX "experiences_studio_id_idx" ON "experiences"("studio_id");

-- CreateIndex
CREATE INDEX "experiences_status_idx" ON "experiences"("status");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_studio_id_slug_key" ON "experiences"("studio_id", "slug");

-- CreateIndex
CREATE INDEX "booking_slots_experience_id_slot_date_idx" ON "booking_slots"("experience_id", "slot_date");

-- CreateIndex
CREATE INDEX "bookings_studio_id_idx" ON "bookings"("studio_id");

-- CreateIndex
CREATE INDEX "orders_customer_user_id_idx" ON "orders"("customer_user_id");

-- CreateIndex
CREATE INDEX "order_items_vendor_id_idx" ON "order_items"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_studio_id_key" ON "stripe_accounts"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_stripe_account_id_key" ON "stripe_accounts"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_configs_config_key_key" ON "admin_configs"("config_key");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_domains_domain_name_key" ON "vendor_domains"("domain_name");

-- CreateIndex
CREATE INDEX "vendor_domains_studio_id_idx" ON "vendor_domains"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_flag_key_key" ON "feature_flags"("flag_key");

-- AddForeignKey
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studios" ADD CONSTRAINT "studios_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_images" ADD CONSTRAINT "experience_images_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_policies" ADD CONSTRAINT "cancellation_policies_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_recurring_rule_id_fkey" FOREIGN KEY ("recurring_rule_id") REFERENCES "recurring_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedules" ADD CONSTRAINT "booking_reschedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedules" ADD CONSTRAINT "booking_reschedules_original_slot_id_fkey" FOREIGN KEY ("original_slot_id") REFERENCES "booking_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedules" ADD CONSTRAINT "booking_reschedules_new_slot_id_fkey" FOREIGN KEY ("new_slot_id") REFERENCES "booking_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedules" ADD CONSTRAINT "booking_reschedules_rescheduled_by_user_id_fkey" FOREIGN KEY ("rescheduled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "booking_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_accounts" ADD CONSTRAINT "stripe_accounts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_logs" ADD CONSTRAINT "calendar_sync_logs_calendar_connection_id_fkey" FOREIGN KEY ("calendar_connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_logs" ADD CONSTRAINT "calendar_sync_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_domains" ADD CONSTRAINT "vendor_domains_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_log" ADD CONSTRAINT "booking_audit_log_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_audit_log" ADD CONSTRAINT "booking_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

