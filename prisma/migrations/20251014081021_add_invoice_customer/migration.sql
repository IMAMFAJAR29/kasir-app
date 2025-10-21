/*
  Warnings:

  - You are about to drop the column `customerEmail` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "ref" TEXT;

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "public"."Customer"("email");

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
