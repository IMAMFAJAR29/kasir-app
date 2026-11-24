-- Batas minimum stok per produk per gudang.
-- Dipisahkan dari ProductStock agar threshold bisa diatur tanpa harus ada
-- baris stok terlebih dahulu. minStock = 0 berarti tanpa peringatan.
CREATE TABLE "public"."product_minimum_stock" (
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_minimum_stock_pkey" PRIMARY KEY ("productId","locationId")
);

CREATE INDEX "product_minimum_stock_locationId_idx" ON "public"."product_minimum_stock"("locationId");

ALTER TABLE "public"."product_minimum_stock" ADD CONSTRAINT "product_minimum_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_minimum_stock" ADD CONSTRAINT "product_minimum_stock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
