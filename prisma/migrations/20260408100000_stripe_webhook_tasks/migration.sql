-- Extend Stripe webhook event store + per-concern task failures (audit ID 0008)
ALTER TABLE "stripe_webhook_events" ADD COLUMN "failed_at" TIMESTAMP(3);
ALTER TABLE "stripe_webhook_events" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stripe_webhook_events" ADD COLUMN "payload" JSONB;

CREATE INDEX "stripe_webhook_events_failed_at_idx" ON "stripe_webhook_events"("failed_at");

CREATE TABLE "stripe_webhook_event_tasks" (
    "id" UUID NOT NULL,
    "stripe_webhook_event_id" TEXT NOT NULL,
    "concern" TEXT NOT NULL,
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_event_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stripe_webhook_event_tasks_stripe_webhook_event_id_idx" ON "stripe_webhook_event_tasks"("stripe_webhook_event_id");
CREATE INDEX "stripe_webhook_event_tasks_failed_at_idx" ON "stripe_webhook_event_tasks"("failed_at");

ALTER TABLE "stripe_webhook_event_tasks" ADD CONSTRAINT "stripe_webhook_event_tasks_stripe_webhook_event_id_fkey" FOREIGN KEY ("stripe_webhook_event_id") REFERENCES "stripe_webhook_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
