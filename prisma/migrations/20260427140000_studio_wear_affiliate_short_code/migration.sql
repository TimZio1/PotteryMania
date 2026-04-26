-- Short public link per studio: /w/{wear_affiliate_code} → wear shop + ref
ALTER TABLE "studio_wear_configs" ADD COLUMN "wear_affiliate_code" TEXT;

CREATE UNIQUE INDEX "studio_wear_configs_wear_affiliate_code_key" ON "studio_wear_configs"("wear_affiliate_code");
