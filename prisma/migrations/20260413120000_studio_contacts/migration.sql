-- P1-D: Studio vendor CRM contacts (notes, tags, manual rows merged with bookings)

CREATE TABLE "studio_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studio_id" UUID NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "studio_contacts_studio_id_email_normalized_key" ON "studio_contacts"("studio_id", "email_normalized");

CREATE INDEX "studio_contacts_studio_id_idx" ON "studio_contacts"("studio_id");

ALTER TABLE "studio_contacts" ADD CONSTRAINT "studio_contacts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
