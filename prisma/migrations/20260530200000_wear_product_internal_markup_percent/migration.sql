-- Per-product COGS × markup% when set (overrides category internal pricing rules).
ALTER TABLE "wear_products" ADD COLUMN "internal_markup_percent" DOUBLE PRECISION;
