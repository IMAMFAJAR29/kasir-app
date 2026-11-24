-- Stock Opname: sesi penghitungan fisik dengan draft dan approval.
-- Posting approval membuat StockAdjustment (opnameId) dan memakai mekanisme
-- stok + jurnal yang sudah ada.

CREATE TABLE "public"."stock_opnames" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "locationId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "rejectionNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "submittedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_opnames_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."stock_opname_items" (
    "id" SERIAL NOT NULL,
    "opnameId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "systemQty" INTEGER NOT NULL,
    "countedQty" INTEGER NOT NULL,
    "difference" INTEGER NOT NULL,

    CONSTRAINT "stock_opname_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_opnames_no_key" ON "public"."stock_opnames"("no");
CREATE INDEX "stock_opnames_locationId_status_idx" ON "public"."stock_opnames"("locationId", "status");
CREATE INDEX "stock_opnames_createdBy_idx" ON "public"."stock_opnames"("createdBy");
CREATE UNIQUE INDEX "stock_opname_items_opnameId_productId_key" ON "public"."stock_opname_items"("opnameId", "productId");
CREATE INDEX "stock_opname_items_productId_idx" ON "public"."stock_opname_items"("productId");

ALTER TABLE "public"."stock_adjustments" ADD COLUMN "opnameId" INTEGER;
CREATE INDEX "stock_adjustments_opnameId_idx" ON "public"."stock_adjustments"("opnameId");

ALTER TABLE "public"."stock_opnames" ADD CONSTRAINT "stock_opnames_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."stock_opname_items" ADD CONSTRAINT "stock_opname_items_opnameId_fkey" FOREIGN KEY ("opnameId") REFERENCES "public"."stock_opnames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."stock_opname_items" ADD CONSTRAINT "stock_opname_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_opnameId_fkey" FOREIGN KEY ("opnameId") REFERENCES "public"."stock_opnames"("id") ON DELETE SET NULL ON UPDATE CASCADE;
