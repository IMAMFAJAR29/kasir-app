-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'customer';

-- CreateTable
CREATE TABLE "public"."purchases" (
    "id" SERIAL NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" INTEGER,
    "locationId" INTEGER,
    "refNo" TEXT,
    "buyer" TEXT,
    "date" TIMESTAMP(3),
    "termin" INTEGER,
    "dueDate" TIMESTAMP(3),
    "discount" DECIMAL(65,30) DEFAULT 0.00,
    "shipping" DECIMAL(65,30) DEFAULT 0.00,
    "notes" TEXT,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_items" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0.00,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchaseNumber_key" ON "public"."purchases"("purchaseNumber");

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
