-- Persist every Telegram update before processing it. Telegram can retry webhook
-- deliveries, so update_id must be the database-level idempotency key.
CREATE TABLE "telegram_updates" (
    "update_id" TEXT NOT NULL,
    "chat_id" TEXT,
    "message_id" TEXT,
    "request_hash" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "telegram_updates_pkey" PRIMARY KEY ("update_id")
);

ALTER TABLE "orders" ADD COLUMN "telegram_update_id" TEXT;

CREATE UNIQUE INDEX "orders_telegram_update_id_key" ON "orders"("telegram_update_id");
CREATE INDEX "telegram_updates_created_at_idx" ON "telegram_updates"("created_at");
CREATE INDEX "telegram_updates_status_idx" ON "telegram_updates"("status");
CREATE INDEX "telegram_updates_request_hash_created_at_idx" ON "telegram_updates"("request_hash", "created_at");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_telegram_update_id_fkey"
FOREIGN KEY ("telegram_update_id") REFERENCES "telegram_updates"("update_id")
ON DELETE SET NULL ON UPDATE CASCADE;
