-- Studio owner "business template" selection (gallery + dashboard emphasis)
ALTER TABLE "studios" ADD COLUMN "business_template_slug" TEXT;
ALTER TABLE "studios" ADD COLUMN "business_template_activated_at" TIMESTAMP(3);
