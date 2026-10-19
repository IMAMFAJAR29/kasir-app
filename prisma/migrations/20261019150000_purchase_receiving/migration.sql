CREATE TABLE "public"."purchase_receipts" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "supplierDeliveryNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    "qcBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "qcCompletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stockPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."purchase_receipt_items" (
    "id" SERIAL NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "purchaseItemId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "expectedProductName" TEXT NOT NULL,
    "expectedSku" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "remainingQtyAtReceipt" INTEGER NOT NULL,
    "deliveryQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "orderDifference" INTEGER NOT NULL DEFAULT 0,
    "productMatches" BOOLEAN NOT NULL DEFAULT true,
    "actualProductId" INTEGER,
    "actualProductName" TEXT,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "qcStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "purchase_receipt_items_nonnegative_quantities_check"
      CHECK ("orderedQty" >= 0 AND "remainingQtyAtReceipt" >= 0 AND "deliveryQty" >= 0 AND "receivedQty" >= 0)
);

CREATE UNIQUE INDEX "purchase_receipts_receiptNumber_key"
  ON "public"."purchase_receipts"("receiptNumber");
CREATE UNIQUE INDEX "purchase_receipts_requestKey_key"
  ON "public"."purchase_receipts"("requestKey");
CREATE INDEX "purchase_receipts_purchaseId_createdAt_idx"
  ON "public"."purchase_receipts"("purchaseId", "createdAt");
CREATE INDEX "purchase_receipts_status_idx"
  ON "public"."purchase_receipts"("status");
CREATE UNIQUE INDEX "purchase_receipt_items_receiptId_purchaseItemId_key"
  ON "public"."purchase_receipt_items"("receiptId", "purchaseItemId");
CREATE INDEX "purchase_receipt_items_purchaseItemId_idx"
  ON "public"."purchase_receipt_items"("purchaseItemId");

ALTER TABLE "public"."purchase_receipts"
  ADD CONSTRAINT "purchase_receipts_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "public"."purchases"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_receipt_items"
  ADD CONSTRAINT "purchase_receipt_items_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "public"."purchase_receipts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_receipt_items"
  ADD CONSTRAINT "purchase_receipt_items_purchaseItemId_fkey"
  FOREIGN KEY ("purchaseItemId") REFERENCES "public"."purchase_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_receipt_items"
  ADD CONSTRAINT "purchase_receipt_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "public"."Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_receipt_items"
  ADD CONSTRAINT "purchase_receipt_items_actualProductId_fkey"
  FOREIGN KEY ("actualProductId") REFERENCES "public"."Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
