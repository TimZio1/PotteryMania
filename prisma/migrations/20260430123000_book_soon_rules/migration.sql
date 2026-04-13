CREATE TABLE "book_soon_rules" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "days_after_visit" INTEGER NOT NULL,
    "email_subject" TEXT NOT NULL,
    "email_body" TEXT NOT NULL,
    "experience_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "book_soon_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "book_soon_sent" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "book_soon_sent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "book_soon_rules_studio_id_is_active_idx"
ON "book_soon_rules"("studio_id", "is_active");

CREATE UNIQUE INDEX "book_soon_sent_rule_id_booking_id_key"
ON "book_soon_sent"("rule_id", "booking_id");

CREATE INDEX "book_soon_sent_user_id_sent_at_idx"
ON "book_soon_sent"("user_id", "sent_at");

ALTER TABLE "book_soon_rules"
ADD CONSTRAINT "book_soon_rules_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "book_soon_sent"
ADD CONSTRAINT "book_soon_sent_rule_id_fkey"
FOREIGN KEY ("rule_id") REFERENCES "book_soon_rules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "book_soon_sent"
ADD CONSTRAINT "book_soon_sent_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "book_soon_sent"
ADD CONSTRAINT "book_soon_sent_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
