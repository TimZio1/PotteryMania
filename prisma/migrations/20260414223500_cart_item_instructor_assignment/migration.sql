-- FK to instructors is added in 20260501152100_cart_items_instructor_id_fkey (after instructors exists).
ALTER TABLE "cart_items"
ADD COLUMN "instructor_id" UUID;

CREATE INDEX "cart_items_instructor_id_idx"
ON "cart_items"("instructor_id");
