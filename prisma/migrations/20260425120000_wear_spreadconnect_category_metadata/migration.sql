ALTER TABLE "wear_products"
ADD COLUMN "spreadconnect_product_type_id" INTEGER,
ADD COLUMN "spreadconnect_product_type_name" TEXT,
ADD COLUMN "spreadconnect_category_data" JSONB;

CREATE INDEX "wear_products_spreadconnect_product_type_id_idx"
ON "wear_products" ("spreadconnect_product_type_id");
