-- Incremental Spreadconnect catalog sync: stable article id + content fingerprint
ALTER TABLE "wear_products" ADD COLUMN "spreadconnect_article_id" INTEGER;
ALTER TABLE "wear_products" ADD COLUMN "spreadconnect_catalog_fingerprint" VARCHAR(64);

CREATE UNIQUE INDEX "wear_products_spreadconnect_article_id_key" ON "wear_products"("spreadconnect_article_id");
