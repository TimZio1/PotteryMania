-- AlterTable
ALTER TABLE "booking_slots"
ADD COLUMN "seat_capacities" JSONB;

-- AlterTable
ALTER TABLE "bookings"
ADD COLUMN "seat_type" TEXT;

-- CreateTable
CREATE TABLE "studio_date_blocks" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "block_date" DATE NOT NULL,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_date_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_date_blocks_studio_id_block_date_key" ON "studio_date_blocks"("studio_id", "block_date");

-- AddForeignKey
ALTER TABLE "studio_date_blocks"
ADD CONSTRAINT "studio_date_blocks_studio_id_fkey"
FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
