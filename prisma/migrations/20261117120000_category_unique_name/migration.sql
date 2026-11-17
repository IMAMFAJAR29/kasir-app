-- Nama kategori dibuat unik agar tidak ada kategori ambigu saat import.
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");
