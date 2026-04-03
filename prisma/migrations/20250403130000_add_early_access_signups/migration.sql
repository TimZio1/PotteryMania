-- Early access studio registration
CREATE TABLE "early_access_signups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "studio_name" TEXT NOT NULL,
    "website_or_ig" TEXT,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "want_booking" BOOLEAN NOT NULL DEFAULT false,
    "want_market" BOOLEAN NOT NULL DEFAULT false,
    "want_both" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "early_access_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "early_access_signups_email_key" ON "early_access_signups"("email");
