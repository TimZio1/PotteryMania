-- instructors table is created in 20260501152000_marketing_advanced_foundation.
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_instructor_id_fkey";

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_instructor_id_fkey"
FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
