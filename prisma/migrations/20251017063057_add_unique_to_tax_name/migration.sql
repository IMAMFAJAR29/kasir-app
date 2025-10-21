/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Tax` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Tax_name_key" ON "public"."Tax"("name");
