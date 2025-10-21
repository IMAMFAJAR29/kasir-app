-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "locationId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
