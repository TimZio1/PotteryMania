ALTER TABLE "cart_items"
ADD COLUMN "instructor_id" UUID;

CREATE INDEX "cart_items_instructor_id_idx"
ON "cart_items"("instructor_id");

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_instructor_id_fkey"
FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
