# Modul Product — Ringkasan Perbaikan P0 & Rencana Lanjutan

Tanggal: 2026-11-16
Status: Perbaikan P0 selesai, `npm run build` lolos.

---

## 1. Ringkasan

Audit modul Product menemukan tiga masalah utama: route dinamis yang tidak kompatibel dengan Next.js 15, stok yang punya dua sumber kebenaran (`Product.stock` dan `ProductStock`), serta fitur import Excel yang memanggil endpoint yang belum ada.

Perbaikan P0 yang sudah diterapkan:

1. Route dinamis produk dan kategori diperbaiki untuk Next.js 15.
2. Mutasi stok dipusatkan dalam satu helper; `ProductStock` menjadi acuan per lokasi dan `Product.stock` dihitung ulang sebagai total.
3. CRUD produk dirapikan: satu endpoint update, validasi terpusat, error mapping, dan delete dengan pre-check relasi.
4. Fitur import Excel dibuat ulang beserta template baru yang sesuai schema/API terbaru.
5. Harga beli (`costPrice`) ditambahkan ke form, API, dan import.
6. Validasi kategori induk dan pencegahan siklus ditambahkan.

---

## 2. Perbaikan P0

### 2.1 Route dinamis Next.js 15

File:
- `app/api/products/[id]/route.ts`
- `app/api/categories/[id]/route.js`

Perubahan:
- `context.params` sekarang di-`await` sebelum membaca `id`.
- ID divalidasi sebagai bilangan bulat positif.
- GET detail, PUT, dan DELETE produk tidak lagi menerima `NaN`/`undefined`.

### 2.2 Konsistensi stok

File baru: `lib/productStock.ts`

Aturan baru:
- `ProductStock` adalah acuan jumlah stok per lokasi.
- `Product.stock` adalah cache total dari seluruh `ProductStock`.
- Setiap mutasi memanggil `recalculateProductStock()` agar total selalu sinkron.
- Produk lama yang belum punya baris `ProductStock` otomatis di-seed dari `Product.stock` saat pertama kali dimutasi.
- Stok tidak boleh negatif.
- Pengurangan multi-lokasi didistribusikan ke lokasi lain jika lokasi default tidak cukup.
- Create/update produk menyesuaikan stok lokasi default secara delta, bukan menimpa total secara membabi buta.

Alur yang memakai helper:
- `POST /api/products`
- `PUT /api/products/[id]`
- `POST /api/sales`
- `POST /api/invoices` melalui `lib/accounting/invoiceAccounting.ts`
- `POST /api/warehouse/adjustments`
- `POST /api/purchases/receipts/[id]` (aksi `complete`)

Perbaikan tambahan:
- HPP penerimaan barang dihitung sebelum stok ditambah, sehingga moving average tidak double-count.
- Penjualan/faktur menolak qty yang melebihi stok dengan status 409.

### 2.3 CRUD produk

- `PUT /api/products` dihapus; update hanya lewat `PUT /api/products/[id]`.
- Stok tidak lagi ter-reset ke 0 ketika field stok tidak dikirim.
- Field `costPrice` diterima pada create dan update.
- SKU kosong dibuat otomatis dengan format yang lebih terbaca (`SKU-NAMA-XXXXXX`), bukan UUID mentah.
- Barcode kosong disimpan sebagai `null`.
- Kategori divalidasi keberadaannya sebelum produk disimpan.

Delete produk:
- Pre-check ke `SaleItem`, `InvoiceItem`, `PurchaseItem`, `StockAdjustmentItem`, dan `PurchaseReceiptItem`.
- Jika masih dipakai, API mengembalikan 409 dengan daftar dependensi.
- `ProductStock` ikut dihapus dalam transaksi.
- UI sekarang membaca respons dan menampilkan error, tidak lagi menghapus dari state secara optimistis.

### 2.4 Import Excel

Route baru: `POST /api/products/import`

Fitur:
- Membaca `.xlsx` di server dengan `read-excel-file/node`.
- Maksimal 5 MB dan 500 baris.
- Validasi per baris beserta nomor baris.
- Deteksi duplikat SKU/barcode di dalam file dan di database.
- Kategori bisa diisi lewat nama atau ID; jika keduanya diisi harus cocok.
- SKU kosong otomatis dibuat.
- Stok hasil import dibuat di lokasi default.
- Import bersifat all-or-nothing: jika ada satu error, tidak ada produk yang disimpan.
- Error ditampilkan di modal import, bukan hanya alert generik.
- Template lama tetap kompatibel karena header `Harga`, `KategoriId`, `Deskripsi`, dan `URL Gambar` masih dikenali.

Template baru: `public/templates/import-template.xlsx`

| Kolom | Wajib | Keterangan |
|---|---|---|
| Nama | Ya | Nama produk |
| SKU | Tidak | Dibuat otomatis jika kosong |
| Barcode | Tidak | Harus unik |
| Harga Jual | Ya | Angka, minimal 0 |
| Harga Beli | Tidak | Angka, minimal 0 |
| Stok | Tidak | Bilangan bulat, minimal 0 |
| Kategori | Tidak | Nama kategori yang sudah ada |
| Kategori ID | Tidak | Alternatif dari nama kategori |
| Deskripsi | Tidak | Teks |
| URL Gambar | Tidak | Harus `http://` atau `https://` |

Catatan: contoh baris pada template memakai kategori `Minuman`. Ganti dengan kategori yang benar-benar ada di database sebelum import.

### 2.5 Validasi dan error

File baru: `lib/productInput.ts`, `lib/prismaErrors.ts`

- Validasi nama, harga jual, harga beli, stok, SKU, barcode, kategori, deskripsi, dan URL gambar.
- Pemetaan error Prisma: `P2002` (duplikat), `P2003` (relasi), `P2025` (tidak ditemukan).
- Error stok domain: `INSUFFICIENT_STOCK` (409) dan `INVALID_STOCK` (400).
- Pesan error dipakai konsisten oleh API produk, stok, dan UI.

### 2.6 Kategori

- `POST /api/categories` memvalidasi nama dan keberadaan kategori induk.
- `PUT /api/categories/[id]` menolak induk yang sama dengan dirinya sendiri atau turunannya.
- DELETE kategori mengembalikan 404/409 yang jelas.

### 2.7 Konfigurasi build

`next.config.mjs`:
- `serverExternalPackages: ["read-excel-file"]` agar `read-excel-file/node` tidak dipaksa di-bundle bersama `unzipper`.

---

## 3. File yang berubah

| File | Jenis |
|---|---|
| `app/api/products/route.ts` | Diubah |
| `app/api/products/[id]/route.ts` | Diubah |
| `app/api/products/import/route.ts` | Baru |
| `app/api/categories/route.js` | Diubah |
| `app/api/categories/[id]/route.js` | Diubah |
| `app/api/sales/route.js` | Diubah |
| `app/api/invoices/route.ts` | Diubah |
| `app/api/warehouse/adjustments/route.ts` | Diubah |
| `app/api/purchases/receipts/[id]/route.ts` | Diubah |
| `app/admin/products/page.tsx` | Diubah |
| `components/products/ProductForm.tsx` | Diubah |
| `components/products/ImportModal.tsx` | Diubah |
| `components/products/ProductList.tsx` | Diubah |
| `lib/accounting/invoiceAccounting.ts` | Diubah |
| `lib/productInput.ts` | Baru |
| `lib/productStock.ts` | Baru |
| `lib/productImport.ts` | Baru |
| `lib/prismaErrors.ts` | Baru |
| `types/products.ts` | Diubah |
| `next.config.mjs` | Diubah |
| `public/templates/import-template.xlsx` | Diganti |

---

## 4. Verifikasi

- `npm run build`: berhasil, termasuk route `/api/products/import`.
- ESLint untuk seluruh file yang diubah: bersih.
- Type-check: modul Product bersih.
- Masih ada error type-check lama di modul lain karena bug `params` Next.js 15 yang sama:
  - `app/api/customers/[id]/route.ts`
  - `app/api/sales/[id]/route.ts`
  - `app/api/taxes/route.ts`
  - `app/api/reports/invoices/[id]/route.ts`
- Dev server tidak dapat diuji lewat HTTP di environment ini karena middleware edge gagal dengan `Code generation from strings disallowed`. Ini masalah environment, bukan hasil perubahan modul Product.

---

## 5. Perbaikan yang Belum

### P1 — sebelum integrasi Jubelio

| Item | Alasan |
|---|---|
| Tenancy (`tenantId`/`storeId`) | Schema belum punya kepemilikan data; semua produk global. Perlu keputusan arsitektur karena menyentuh model user/sesi. |
| External ID Jubelio (`jubelioItemId`, `jubelioCategoryId`, `jubelioLocationId`) | Diperlukan untuk idempotensi dan rekonsiliasi. |
| Mapping kategori internal ke kategori Jubelio | Saat ini hanya ID internal. |
| Satuan (`sellUnit`/`buyUnit`) | Field Jubelio belum ada padanannya. |
| Status produk (`isActive`) | Belum ada nonaktifkan/arsip; hanya hapus. |
| Stock movement ledger | Belum ada riwayat pergerakan stok per dokumen. |
| Pagination & search server-side | `/api/products` masih mengembalikan seluruh katalog. |
| SKU/barcode unik per tenant | Saat ini unik global. |
| Perbaikan `params` di modul lain | Customers, sales detail, taxes, report invoice. |
| `db:seed` | `package.json` menunjuk `prisma/seed.js`, file aslinya `seed.ts`. |

### P2 — kualitas dan skala

- Product Group / Variant / Bundle.
- Sinkronisasi Jubelio: credential per tenant, outbox, retry, webhook, logging.
- Audit trail `createdBy`/`updatedBy`.
- Soft delete dan lifecycle gambar Cloudinary.
- Barcode 1D (saat ini cetak PDF memakai QR).
- Test otomatis untuk CRUD dan mutasi stok.
- Aktifkan type-check dan lint saat build (sekarang di-skip).

---

## 6. Rencana UI/UX Berikutnya

### 6.1 Halaman detail produk

- Route baru `/admin/products/[id]`.
- Tab: Ringkasan, Stok per Lokasi, Riwayat Pergerakan, Harga & Margin.
- Aksi cepat: edit, cetak barcode, nonaktifkan, sinkron Jubelio.
- Menampilkan status sinkronisasi dan external ID.

### 6.2 Form produk

- Kelompokkan field menjadi: Informasi Dasar, Harga, Stok, Media.
- Tampilkan margin otomatis dari harga jual dan harga beli.
- Validasi inline per field, bukan hanya pesan global.
- Siapkan slot satuan jual/beli dan status aktif.
- Konfirmasi sebelum mengubah stok total agar jelas lokasi mana yang terdampak.

### 6.3 Import

- Preview tabel sebelum commit.
- Progress bar dan ringkasan hasil (berhasil/gagal).
- Tombol unduh laporan error dalam Excel.
- Drag & drop file.
- Pilihan strategi duplikat: tolak semua, lewati, atau update.
- Tampilkan contoh baris dan daftar kategori yang tersedia.

### 6.4 Daftar produk

- Pagination dan search server-side.
- Bulk action: hapus, ubah kategori, cetak barcode.
- Filter status stok berdasarkan lokasi.
- Kolom yang bisa dikonfigurasi dan indikator stok per gudang.
- Empty state dan loading skeleton yang konsisten.

### 6.5 Kategori

- Manajemen tree inline (tambah/edit/hapus tanpa modal terpisah).
- Pencegahan siklus sudah ada di API; tampilkan pesan yang ramah di UI.
- Mapping kategori Jubelio di samping nama kategori.

### 6.6 Stok

- Timeline pergerakan stok per produk/lokasi.
- Transfer stok antar lokasi.
- Peringatan stok minimum per produk.

### 6.7 Integrasi Jubelio

- Badge status: belum tersinkron, tersinkron, gagal.
- Tombol sinkron manual per produk.
- Halaman pengaturan mapping kategori dan lokasi.
- Log sinkronisasi dengan detail error.

---

## 7. Cara Pakai Import

1. Buka halaman Produk, klik `+ Tambah Produk` → `Import File Excel`.
2. Unduh template terbaru.
3. Isi minimal kolom `Nama` dan `Harga Jual`.
4. Isi `Kategori` dengan nama kategori yang sudah ada, atau `Kategori ID`.
5. Import. Jika ada error, modal akan menampilkan nomor baris dan penyebabnya; tidak ada data yang tersimpan sebagian.

---

## 8. Catatan Tenancy

Saat ini `Product`, `Category`, `Location`, dan `User` tidak memiliki `tenantId`, `storeId`, atau `ownerId`. Artinya:

- Semua pengguna dengan izin `products.view` melihat katalog yang sama.
- Semua pengguna dengan izin `products.update` dapat mengubah produk mana pun.
- Service Worker juga meng-cache `/api/products` per URL, bukan per pengguna.

Jika aplikasi memang satu database untuk banyak pelanggan, tenancy harus ditambahkan sebelum integrasi Jubelio. Jika satu deployment/DB per pelanggan, isolasi bersifat infrastruktur dan perlu dinyatakan eksplisit.
