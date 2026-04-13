ALTER TABLE "studios"
  ADD COLUMN "tips_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "experiences"
  ADD COLUMN "look_busy_max_slots_per_day" INTEGER,
  ADD COLUMN "max_advance_booking_days" INTEGER,
  ADD COLUMN "max_active_bookings_per_customer" INTEGER;

ALTER TABLE "bookings"
  ADD COLUMN "instructor_id" UUID,
  ADD COLUMN "tip_amount_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "terms_accepted_at" TIMESTAMP(3);

CREATE TABLE "studio_gallery_images" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "image_url" TEXT NOT NULL,
  "caption" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "studio_gallery_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_posts" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "image_url" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "studio_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instructors" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "user_id" UUID,
  "name" TEXT NOT NULL,
  "bio" TEXT,
  "avatar_url" TEXT,
  "color" TEXT,
  "working_hours" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instructor_experience_links" (
  "id" UUID NOT NULL,
  "instructor_id" UUID NOT NULL,
  "experience_id" UUID NOT NULL,
  CONSTRAINT "instructor_experience_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_notes" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT,
  "note" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#FEF3C7',
  "is_all_day" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "studio_locations" (
  "id" UUID NOT NULL,
  "studio_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "postal_code" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "studio_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bookings_instructor_id_idx" ON "bookings"("instructor_id");
CREATE INDEX "studio_gallery_images_studio_id_is_active_sort_order_idx" ON "studio_gallery_images"("studio_id", "is_active", "sort_order");
CREATE UNIQUE INDEX "studio_posts_studio_id_slug_key" ON "studio_posts"("studio_id", "slug");
CREATE INDEX "studio_posts_studio_id_is_published_published_at_idx" ON "studio_posts"("studio_id", "is_published", "published_at");
CREATE INDEX "instructors_studio_id_is_active_idx" ON "instructors"("studio_id", "is_active");
CREATE INDEX "instructors_user_id_idx" ON "instructors"("user_id");
CREATE UNIQUE INDEX "instructor_experience_links_instructor_id_experience_id_key" ON "instructor_experience_links"("instructor_id", "experience_id");
CREATE INDEX "instructor_experience_links_experience_id_idx" ON "instructor_experience_links"("experience_id");
CREATE INDEX "calendar_notes_studio_id_date_idx" ON "calendar_notes"("studio_id", "date");
CREATE INDEX "studio_locations_studio_id_is_active_is_default_idx" ON "studio_locations"("studio_id", "is_active", "is_default");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "studio_gallery_images"
  ADD CONSTRAINT "studio_gallery_images_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_posts"
  ADD CONSTRAINT "studio_posts_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "instructors"
  ADD CONSTRAINT "instructors_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instructor_experience_links"
  ADD CONSTRAINT "instructor_experience_links_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "instructor_experience_links_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_notes"
  ADD CONSTRAINT "calendar_notes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_locations"
  ADD CONSTRAINT "studio_locations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
