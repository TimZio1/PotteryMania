CREATE TABLE "admin_inbox_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "mailbox" TEXT NOT NULL DEFAULT 'support',
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text_body" TEXT,
    "html_body" TEXT,
    "provider_message_id" TEXT,
    "thread_key" TEXT,
    "in_reply_to_id" UUID,
    "sent_by_user_id" UUID,
    "read_at" TIMESTAMP(3),
    "saved_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_inbox_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_inbox_messages_provider_message_id_key"
    ON "admin_inbox_messages"("provider_message_id");

CREATE INDEX "admin_inbox_messages_direction_created_at_idx"
    ON "admin_inbox_messages"("direction", "created_at" DESC);

CREATE INDEX "admin_inbox_messages_mailbox_created_at_idx"
    ON "admin_inbox_messages"("mailbox", "created_at" DESC);

CREATE INDEX "admin_inbox_messages_read_at_idx"
    ON "admin_inbox_messages"("read_at");

CREATE INDEX "admin_inbox_messages_saved_at_idx"
    ON "admin_inbox_messages"("saved_at");

CREATE INDEX "admin_inbox_messages_deleted_at_idx"
    ON "admin_inbox_messages"("deleted_at");

CREATE INDEX "admin_inbox_messages_thread_key_idx"
    ON "admin_inbox_messages"("thread_key");
