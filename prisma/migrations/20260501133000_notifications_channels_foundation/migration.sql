ALTER TABLE "studios"
  ADD COLUMN "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twilio_account_sid" TEXT,
  ADD COLUMN "twilio_auth_token" TEXT,
  ADD COLUMN "twilio_phone_number" TEXT,
  ADD COLUMN "whatsapp_notifications_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "notification_templates" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "template_type" TEXT NOT NULL,
  "experience_id" UUID,
  "subject" TEXT NOT NULL,
  "body_html" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_templates_studio_id_template_type_is_active_idx"
  ON "notification_templates"("studio_id", "template_type", "is_active");
CREATE INDEX "notification_templates_experience_id_idx"
  ON "notification_templates"("experience_id");

ALTER TABLE "notification_templates"
  ADD CONSTRAINT "notification_templates_studio_id_fkey"
  FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "notification_templates_experience_id_fkey"
  FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
