-- Transfer dua langkah: IN_TRANSIT -> RECEIVED.
-- Nilai barang selama perjalanan dipindahkan ke akun Persediaan Dalam
-- Perjalanan (1-1350). Selisih saat penerimaan dibebankan ke 5-1990.

ALTER TABLE "public"."stock_transfers"
ADD COLUMN "requestKey" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "receivedAt" TIMESTAMP(3),
ADD COLUMN "receivedBy" TEXT;

ALTER TABLE "public"."stock_transfers" ALTER COLUMN "status" SET DEFAULT 'IN_TRANSIT';

ALTER TABLE "public"."stock_transfer_items" ADD COLUMN "receivedQty" INTEGER;

CREATE UNIQUE INDEX "stock_transfers_requestKey_key" ON "public"."stock_transfers"("requestKey");
CREATE INDEX "stock_transfers_status_idx" ON "public"."stock_transfers"("status");

-- Transfer lama dibuat satu langkah (status POSTED). Anggap sudah diterima
-- penuh agar riwayat tetap konsisten tanpa posting ulang stok.
UPDATE "public"."stock_transfers"
SET "status" = 'RECEIVED',
    "sentAt" = COALESCE("sentAt", "date"),
    "receivedAt" = COALESCE("receivedAt", "date")
WHERE "status" = 'POSTED';

UPDATE "public"."stock_transfer_items"
SET "receivedQty" = "qty"
WHERE "receivedQty" IS NULL;
