-- Produk bundle: tabel `bom` menandai produk sebagai bundle, `bom_component`
-- menyimpan komposisinya. Produk bundle tidak punya stok sendiri.
-- Snapshot komposisi disimpan di invoice_items.components untuk restore stok.

-- AlterTable
ALTER TABLE "public"."invoice_items" ADD COLUMN     "components" JSONB;

-- CreateTable
CREATE TABLE "public"."bom" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bom_component" (
    "id" SERIAL NOT NULL,
    "bomId" INTEGER NOT NULL,
    "componentProductId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "bom_component_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bom_productId_key" ON "public"."bom"("productId");

-- CreateIndex
CREATE INDEX "bom_component_componentProductId_idx" ON "public"."bom_component"("componentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "bom_component_bomId_componentProductId_key" ON "public"."bom_component"("bomId", "componentProductId");

-- AddForeignKey
ALTER TABLE "public"."bom" ADD CONSTRAINT "bom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bom_component" ADD CONSTRAINT "bom_component_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "public"."bom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bom_component" ADD CONSTRAINT "bom_component_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
