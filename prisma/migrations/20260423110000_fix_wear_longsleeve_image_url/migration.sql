-- Unsplash photo-1610701596007-1150281fbcdd was removed (404). Align with prisma/wear-products-seed.cjs.
UPDATE "wear_products"
SET
  "images" = '["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80"]'::jsonb,
  "updated_at" = NOW()
WHERE "slug" = 'hands-in-the-clay-longsleeve';
