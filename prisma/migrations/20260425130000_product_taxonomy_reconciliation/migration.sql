DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE lower(typname) = lower('CeramicCategory')
  ) THEN
    CREATE TYPE "CeramicCategory" AS ENUM (
      'tableware',
      'decorative_objects',
      'vases_and_plant_pots',
      'lighting',
      'kitchen_and_serving',
      'coffee_and_tea',
      'bathroom_and_wellness',
      'jewelry_and_small_objects',
      'outdoor_and_garden',
      'ritual_and_artistic_pieces'
    );
  END IF;
END$$;

ALTER TABLE "product_categories"
  ADD COLUMN IF NOT EXISTS "short_description" TEXT,
  ADD COLUMN IF NOT EXISTS "long_description" TEXT,
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "icon" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

UPDATE "product_categories"
SET
  "short_description" = COALESCE("short_description", 'Handmade ceramics from independent studios.'),
  "long_description" = COALESCE(
    "long_description",
    'Discover handmade ceramic pieces designed by independent studios for daily rituals, interiors, gifting, and collecting.'
  ),
  "image_url" = COALESCE(
    "image_url",
    'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1800&q=80'
  ),
  "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

ALTER TABLE "product_categories"
  ALTER COLUMN "short_description" SET NOT NULL,
  ALTER COLUMN "long_description" SET NOT NULL,
  ALTER COLUMN "image_url" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "category" "CeramicCategory",
  ADD COLUMN IF NOT EXISTS "subcategory" TEXT;

UPDATE "products" AS p
SET "category" = CASE pc.slug
  WHEN 'tableware' THEN 'tableware'::"CeramicCategory"
  WHEN 'decorative-objects' THEN 'decorative_objects'::"CeramicCategory"
  WHEN 'vases-plant-pots' THEN 'vases_and_plant_pots'::"CeramicCategory"
  WHEN 'lighting' THEN 'lighting'::"CeramicCategory"
  WHEN 'kitchen-serving' THEN 'kitchen_and_serving'::"CeramicCategory"
  WHEN 'coffee-tea' THEN 'coffee_and_tea'::"CeramicCategory"
  WHEN 'bathroom-wellness' THEN 'bathroom_and_wellness'::"CeramicCategory"
  WHEN 'jewelry-small-objects' THEN 'jewelry_and_small_objects'::"CeramicCategory"
  WHEN 'outdoor-garden' THEN 'outdoor_and_garden'::"CeramicCategory"
  WHEN 'ritual-artistic-pieces' THEN 'ritual_and_artistic_pieces'::"CeramicCategory"
  ELSE 'tableware'::"CeramicCategory"
END
FROM "product_categories" AS pc
WHERE p."category_id" = pc."id"
  AND p."category" IS NULL;

UPDATE "products"
SET "category" = 'tableware'::"CeramicCategory"
WHERE "category" IS NULL;

ALTER TABLE "products"
  ALTER COLUMN "category" SET DEFAULT 'tableware',
  ALTER COLUMN "category" SET NOT NULL;
