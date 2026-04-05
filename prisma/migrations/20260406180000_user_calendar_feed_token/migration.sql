-- Secret URL token for subscribing to a user's booking calendar (ICS feed).
ALTER TABLE "users" ADD COLUMN "calendar_feed_token" TEXT;

CREATE UNIQUE INDEX "users_calendar_feed_token_key" ON "users"("calendar_feed_token");
