-- Stripe webhook idempotency (audit fix ID 0008)
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stripe_webhook_events_processed_at_idx" ON "stripe_webhook_events"("processed_at");
CREATE INDEX "stripe_webhook_events_received_at_idx" ON "stripe_webhook_events"("received_at" DESC);
