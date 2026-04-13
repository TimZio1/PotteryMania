-- Booking add-ons + intake forms

DO $$
BEGIN
    CREATE TYPE "IntakeFieldType" AS ENUM (
        'text_single',
        'text_multi',
        'number',
        'checkbox',
        'dropdown',
        'date',
        'file_upload'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "cart_items"
ADD COLUMN IF NOT EXISTS "add_on_selections" JSONB,
ADD COLUMN IF NOT EXISTS "intake_response_payload" JSONB;

CREATE TABLE "experience_add_ons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "duration_minutes_extra" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_selected_by_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "max_per_booking" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_add_ons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "experience_add_ons_studio_id_is_active_sort_order_idx"
ON "experience_add_ons"("studio_id", "is_active", "sort_order");

ALTER TABLE "experience_add_ons"
ADD CONSTRAINT "experience_add_ons_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "experience_add_on_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "add_on_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,

    CONSTRAINT "experience_add_on_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "experience_add_on_links_add_on_id_experience_id_key"
ON "experience_add_on_links"("add_on_id", "experience_id");

CREATE INDEX "experience_add_on_links_experience_id_idx"
ON "experience_add_on_links"("experience_id");

ALTER TABLE "experience_add_on_links"
ADD CONSTRAINT "experience_add_on_links_add_on_id_fkey"
FOREIGN KEY ("add_on_id") REFERENCES "experience_add_ons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "experience_add_on_links"
ADD CONSTRAINT "experience_add_on_links_experience_id_fkey"
FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "intake_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "field_type" "IntakeFieldType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "include_in_invoice" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_forms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intake_forms_studio_id_sort_order_idx"
ON "intake_forms"("studio_id", "sort_order");

ALTER TABLE "intake_forms"
ADD CONSTRAINT "intake_forms_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "intake_form_experience_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "experience_id" UUID NOT NULL,

    CONSTRAINT "intake_form_experience_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "intake_form_experience_links_form_id_experience_id_key"
ON "intake_form_experience_links"("form_id", "experience_id");

CREATE INDEX "intake_form_experience_links_experience_id_idx"
ON "intake_form_experience_links"("experience_id");

ALTER TABLE "intake_form_experience_links"
ADD CONSTRAINT "intake_form_experience_links_form_id_fkey"
FOREIGN KEY ("form_id") REFERENCES "intake_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_form_experience_links"
ADD CONSTRAINT "intake_form_experience_links_experience_id_fkey"
FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "booking_add_ons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "add_on_id" UUID,
    "add_on_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "duration_minutes_extra" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_add_ons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_add_ons_booking_id_idx"
ON "booking_add_ons"("booking_id");

ALTER TABLE "booking_add_ons"
ADD CONSTRAINT "booking_add_ons_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_add_ons"
ADD CONSTRAINT "booking_add_ons_add_on_id_fkey"
FOREIGN KEY ("add_on_id") REFERENCES "experience_add_ons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "intake_form_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID,
    "booking_id" UUID NOT NULL,
    "label_snapshot" TEXT NOT NULL,
    "field_type_snapshot" "IntakeFieldType" NOT NULL,
    "include_in_invoice_snapshot" BOOLEAN NOT NULL DEFAULT false,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_form_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "intake_form_responses_booking_id_idx"
ON "intake_form_responses"("booking_id");

CREATE INDEX "intake_form_responses_form_id_idx"
ON "intake_form_responses"("form_id");

ALTER TABLE "intake_form_responses"
ADD CONSTRAINT "intake_form_responses_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_form_responses"
ADD CONSTRAINT "intake_form_responses_form_id_fkey"
FOREIGN KEY ("form_id") REFERENCES "intake_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
