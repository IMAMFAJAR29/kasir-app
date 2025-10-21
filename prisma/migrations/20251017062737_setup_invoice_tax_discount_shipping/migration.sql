/*
  Warnings:

  - You are about to drop the column `ref` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "ref",
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "discount" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "refNo" TEXT,
ADD COLUMN     "salesman" TEXT,
ADD COLUMN     "shipping" DECIMAL(65,30) DEFAULT 0.00,
ADD COLUMN     "taxId" INTEGER,
ADD COLUMN     "termin" INTEGER;

-- CreateTable
CREATE TABLE "public"."Tax" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "public"."Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;
