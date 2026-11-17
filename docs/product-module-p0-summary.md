# Modul Product — Ringkasan Perbaikan P0 & Rencana Lanjutan

Tanggal: 2026-11-16 (diperbarui 2026-11-17)
Commit kode Fase A & B: `d7b06db` — `fix(product): perbaiki integritas stok, kategori, dan quality gate` (branch `main`, sudah di-push).
Status: Perbaikan P0, Fase A (stok lanjutan), dan Fase B (kategori, `params`, quality gate) selesai. `npm run build` lolos dengan type-check dan lint aktif.

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
7. Fase A (2026-11-17): stok multi-lokasi diperbaiki, mutasi stok pada edit/hapus faktur disinkronkan, dan form edit produk tidak lagi mengirim stok basi.
8. Fase B (2026-11-17): kategori diamankan (hapus, parent opsional, nama unik + migrasi), UI edit kategori ditambahkan, `params` Next.js 15 dibereskan, dan type-check/lint kembali aktif saat build.

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
- Fase B memperluas pola yang sama ke `customers/[id]`, `sales/[id]`, `reports/invoices/[id]`, dan `taxes/[id]` (detail di bagian 2.9).

### 2.2 Konsistensi stok

File baru: `lib/productStock.ts`

Aturan baru:
- `ProductStock` adalah acuan jumlah stok per lokasi.
- `Product.stock` adalah cache total dari seluruh `ProductStock`.
- Setiap mutasi berbasis lokasi memanggil `recalculateProductStock()` agar total selalu sinkron.
- Produk lama yang belum punya baris `ProductStock` otomatis di-seed dari `Product.stock` saat pertama kali dimutasi (termasuk lewat penyesuaian stok).
- Stok tidak boleh negatif.
- Pengurangan stok POS dapat mengambil dari lokasi lain jika lokasi default tidak cukup (`allowOtherLocations`); faktur tetap ketat per lokasi agar stok tidak berpindah gudang tanpa sengaja.
- Create/update produk menyesuaikan stok lokasi default secara delta, bukan menimpa total secara membabi buta.

Alur yang memakai helper:
- `POST /api/products`
- `PUT /api/products/[id]`
- `POST /api/sales`
- `POST /api/invoices` dan `PUT`/`DELETE /api/invoices/[id]` melalui `lib/accounting/invoiceAccounting.ts`
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
- Error ditampilkan di modal import, bukan hanya alert generik, termasuk total error sebenarnya jika detail dipotong 100 baris.
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

- `POST /api/categories` memvalidasi nama, keberadaan kategori induk, dan nama unik (case-insensitive).
- `PUT /api/categories/[id]` menolak induk yang sama dengan dirinya sendiri atau turunannya.
- `PUT` hanya mengubah `parentId` jika field itu dikirim; rename tanpa `parentId` tidak lagi membuat kategori menjadi root.
- `DELETE /api/categories/[id]` mengecek subkategori dan produk terlebih dahulu dan mengembalikan 409 dengan pesan jelas. FK `Cascade`/`SetNull` tidak lagi bisa menghapus atau melepas data diam-diam.
- Nama kategori dijaga unik di level aplikasi dan database (`Category_name_key`, migrasi `20261117120000_category_unique_name`).
- UI `/admin/categories` sekarang bisa edit nama/induk kategori dan menampilkan pesan error dari server.

### 2.7 Konfigurasi build

`next.config.mjs`:
- `serverExternalPackages: ["read-excel-file"]` agar `read-excel-file/node` tidak dipaksa di-bundle bersama `unzipper`.
- `typescript.ignoreBuildErrors` dan `eslint.ignoreDuringBuilds` dihapus. Build sekarang menjalankan type-check dan lint; warning lint tidak menggagalkan build.

### 2.8 Fase A — perbaikan stok lanjutan (2026-11-17)

Audit ulang menemukan beberapa celah pada aturan stok P0. Perbaikan berikut sudah diterapkan:

**Stok multi-lokasi (`lib/productStock.ts`)**
- `ensureLocationStock()` sekarang memeriksa baris lokasi target, bukan sekadar "produk sudah punya baris".
- Produk legacy (belum punya baris sama sekali) tetap di-seed dari `Product.stock`.
- Jika produk sudah punya baris di lokasi lain, lokasi target dibuat dengan quantity `0` sehingga stok tidak berpindah lokasi tanpa disengaja.
- Helper baru `getLocationStockQuantity()` untuk membaca stok per lokasi sekaligus melakukan seeding legacy.
- `decrementStockAtLocation()` menerima opsi `allowOtherLocations`. Jika `true`, kekurangan di lokasi target diambil dari lokasi lain (dipakai POS yang tidak punya pemilih lokasi). Jika `false`, error menyebutkan jumlah stok di lokasi lain agar tidak menyesatkan.
- `setStockAtLocation()` ikut memanggil seeding legacy sebelum menimpa quantity.

**Alur yang terdampak**
- `POST /api/sales`: lokasi default di-resolve sebelum `sale.create`, `Sale.locationId` sekarang disimpan, dan pengurangan stok memakai `allowOtherLocations: true`.
- `POST /api/warehouse/adjustments`: `oldQuantity` dibaca lewat `getLocationStockQuantity`, sehingga selisih dan jurnal penyesuaian benar untuk produk legacy.
- `GET /api/warehouse/stock`: produk legacy tanpa baris `ProductStock` menampilkan `Product.stock`; produk yang sudah punya baris di lokasi lain tetap menampilkan `0` untuk lokasi yang dipilih.
- `PUT /api/invoices/[id]`: stok item lama dikembalikan, item baru dipotong, jurnal INVOICE lama di-reverse, lalu jurnal baru diposting dalam satu transaksi.
- `DELETE /api/invoices/[id]`: stok dikembalikan dan jurnal di-reverse sebelum faktur dihapus.
- Faktur yang berasal dari transaksi POS (`saleId != null`) tidak boleh diedit/dihapus dari menu faktur (409) agar tidak terjadi penggandaan mutasi stok; kelola dari riwayat penjualan.
- `postJournalEntry()` hanya menganggap entri `status = POSTED` sebagai duplikat, sehingga posting ulang setelah reversal dapat dilakukan.
- `app/admin/products/page.tsx`: field `stock` tidak dikirim saat edit jika nilainya tidak diubah dari snapshot, mencegah stok yang sudah berubah (mis. karena penjualan) tertimpa nilai lama.

### 2.9 Fase B — kategori, `params`, dan quality gate (2026-11-17)

**Kategori**
- `DELETE /api/categories/[id]`: pre-check `_count.children` dan `_count.products`; 409 jika masih dipakai, 404 jika tidak ada.
- `PUT /api/categories/[id]`: `parentId` hanya ditulis jika field benar-benar dikirim; validasi siklus tetap berjalan saat pindah induk.
- Nama kategori unik secara case-insensitive di API (`POST` dan `PUT`) dan di database lewat migrasi `20261117120000_category_unique_name`.
- `app/admin/categories/page.tsx`: tombol edit, modal edit, pesan error server, dan reset state edit yang benar.

**Next.js 15 `params`**
- `app/api/customers/[id]/route.ts`: GET/PUT/DELETE memakai `params: Promise<{ id: string }>` dan `await context.params`. Edit/hapus pelanggan tidak lagi gagal saat runtime.
- `app/api/sales/[id]/route.ts`: `await context.params`.
- `app/api/reports/invoices/[id]/route.ts`: `await context.params` + validasi ID.
- `app/api/taxes/route.ts` tidak lagi menyimpan handler dinamis; PATCH/DELETE dipindah ke `app/api/taxes/[id]/route.ts`.

**Produk & import**
- `PUT /api/products/[id]`: `stock: null` diabaikan (bukan dianggap 0), sehingga stok tidak terhapus.
- Form produk bisa menyimpan harga jual/beli `0`; nilai 0 tidak lagi ditampilkan sebagai input kosong.
- `GET /api/products`: `costPrice` hanya dikirim ke pengguna yang punya izin create/update/delete produk (kasir tidak menerima harga modal).
- Import: UI menampilkan total error sebenarnya saat detail dipotong 100 baris.
- `CategoryModal` menerima `depth` yang benar dari `flattenCategories`.

**Tooling**
- `db:seed` memakai `node --experimental-strip-types prisma/seed.ts` (Node 22.16).
- `next.config.mjs` kembali menjalankan type-check dan lint saat build.

**Ringkasan status Fase B**

| Item | Status | Implementasi |
|---|---|---|
| Hapus kategori tidak aman | Selesai | Pre-check subkategori & produk; 409 dengan pesan jelas; 404 jika tidak ada. |
| `PUT` kategori reset `parentId` | Selesai | `parentId` hanya ditulis jika field dikirim. |
| Nama kategori tidak unik | Selesai | Validasi case-insensitive di API + unique index `Category_name_key` lewat migrasi. |
| UI belum bisa edit kategori | Selesai | Tombol edit + modal edit + pesan error server. |
| `params` Next.js 15 | Selesai | Customers, sales detail, taxes (dipindah ke route `[id]`), report invoice detail. |
| Type-check/lint dimatikan saat build | Selesai | `next.config.mjs` kembali menjalankan keduanya; build bersih. |
| `db:seed` salah file | Selesai | `node --experimental-strip-types prisma/seed.ts`. |
| `stock: null` dianggap 0 | Selesai | `null` diabaikan; stok tidak terhapus. |
| Harga 0 tidak bisa disimpan | Selesai | Input harga menampilkan 0 dan tetap valid. |
| Total error import tidak terlihat | Selesai | UI menampilkan jumlah error sebenarnya di atas 100 detail. |
| `CategoryModal` memakai `cat.depth` kosong | Selesai | `flattenCategories` mengisi `depth`. |
| `costPrice` terkirim ke kasir | Selesai | Hanya dikirim ke pengguna dengan izin kelola produk. |

---

## 3. File yang berubah

Satu file bisa muncul di lebih dari satu fase karena mengalami perubahan tambahan. Semua perubahan Fase A dan B sudah masuk ke commit `d7b06db`.

File yang berubah pada P0:

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

File tambahan yang diubah pada Fase A (2026-11-17):

| File | Jenis |
|---|---|
| `lib/productStock.ts` | Diubah |
| `lib/accounting/postingService.ts` | Diubah |
| `app/api/sales/route.js` | Diubah |
| `app/api/invoices/[id]/route.ts` | Diubah |
| `app/api/warehouse/adjustments/route.ts` | Diubah |
| `app/api/warehouse/stock/route.ts` | Diubah |
| `app/admin/products/page.tsx` | Diubah |
| `app/invoices/page.tsx` | Diubah |

File tambahan yang diubah pada Fase B (2026-11-17):

| File | Jenis |
|---|---|
| `app/api/categories/route.js` | Diubah |
| `app/api/categories/[id]/route.js` | Diubah |
| `app/admin/categories/page.tsx` | Diubah |
| `app/api/customers/[id]/route.ts` | Diubah |
| `app/api/sales/[id]/route.ts` | Diubah |
| `app/api/taxes/route.ts` | Diubah |
| `app/api/taxes/[id]/route.ts` | Baru |
| `app/api/reports/invoices/[id]/route.ts` | Diubah |
| `app/api/products/route.ts` | Diubah |
| `lib/productInput.ts` | Diubah |
| `components/products/ProductForm.tsx` | Diubah |
| `components/products/ImportModal.tsx` | Diubah |
| `components/products/CategoryModal.tsx` | Diubah |
| `app/admin/products/page.tsx` | Diubah |
| `types/products.ts` | Diubah |
| `next.config.mjs` | Diubah |
| `package.json` | Diubah |
| `prisma/schema.prisma` | Diubah |
| `prisma/migrations/20261117120000_category_unique_name/` | Baru |

---

## 4. Verifikasi

Verifikasi 2026-11-17 setelah Fase B:

- `npx tsc --noEmit`: **0 error** di seluruh project.
- `npx eslint .`: **0 error**, 6 warning lama (`react-hooks/exhaustive-deps` dan satu `<img>`); warning tidak menggagalkan build.
- `npm run build`: berhasil, **51/51** static pages.
- Build menjalankan `Linting and checking validity of types ...` karena `ignoreBuildErrors`/`ignoreDuringBuilds` sudah dihapus.
- Migrasi `20261117120000_category_unique_name` sudah diterapkan ke database Neon; `prisma migrate status` bersih dan `prisma migrate diff` melaporkan **No difference detected**.
- Perubahan sudah di-commit sebagai `d7b06db` dan di-push ke `origin/main`.
- Dev server belum diuji end-to-end lewat HTTP di environment ini. Pengujian manual yang disarankan ada di bagian 5.3.

---

## 5. Pekerjaan Lanjutan

### 5.1 P1 — sebelum integrasi Jubelio

| Item | Alasan |
|---|---|
| Tenancy (`tenantId`/`storeId`) | Schema belum punya kepemilikan data; semua produk global. Perlu keputusan arsitektur karena menyentuh model user/sesi. |
| External ID Jubelio (`jubelioItemId`, `jubelioCategoryId`, `jubelioLocationId`) | Diperlukan untuk idempotensi dan rekonsiliasi. |
| Mapping kategori internal ke kategori Jubelio | Saat ini hanya ID internal. |
| Satuan (`sellUnit`/`buyUnit`) | Field Jubelio belum ada padanannya. |
| Status produk (`isActive`) | Belum ada nonaktifkan/arsip; hanya hapus. |
| Stock movement ledger | Belum ada riwayat pergerakan stok per dokumen. |
| Pagination & search server-side | `/api/products` masih mengembalikan seluruh katalog (harga modal sudah tidak dikirim ke kasir). |
| SKU/barcode unik per tenant | Saat ini unik global. |

### 5.2 P2 — kualitas dan skala

- Product Group / Variant / Bundle.
- Sinkronisasi Jubelio: credential per tenant, outbox, retry, webhook, logging.
- Audit trail `createdBy`/`updatedBy`.
- Soft delete dan lifecycle gambar Cloudinary.
- Barcode 1D (saat ini cetak PDF memakai QR).
- Test otomatis untuk CRUD dan mutasi stok.
- Hapus `components/products/ProductList.tsx` yang tidak dipakai (dead code).

### 5.3 Uji manual setelah Fase A & B

1. Produk legacy (punya `Product.stock`, belum punya `ProductStock`) → buka `/warehouse/stock`, pastikan stok tampil benar; lakukan penyesuaian stok, pastikan total tidak turun.
2. Dua lokasi aktif: stok produk hanya di lokasi B, lalu jual lewat POS. Penjualan harus berhasil dan memotong stok lokasi B; `Sale.locationId` terisi lokasi default.
3. Faktur manual: edit qty/harga → stok lama kembali, stok baru terpotong, jurnal lama VOIDED dan jurnal baru POSTED.
4. Hapus faktur manual yang belum lunas → stok kembali dan jurnal di-reverse.
5. Coba edit/hapus faktur hasil transaksi POS → harus 409 dengan pesan jelas.
6. Buka form edit produk, jual produk dari tab lain, lalu ubah harga dan simpan → stok tidak boleh kembali ke nilai saat form dibuka.
7. Import Excel dengan kategori valid, SKU duplikat, dan stok 0 → perilaku all-or-nothing tetap sama.
8. Hapus kategori yang masih punya subkategori atau produk → harus 409 dengan pesan yang menyebut jumlahnya.
9. Rename kategori tanpa mengirim `parentId` → kategori tetap di induk yang sama, tidak pindah ke root.
10. Buat kategori dengan nama yang sama (beda huruf besar/kecil) → ditolak 400; edit kategori lewat tombol pensil → nama/induk berubah.
11. Edit lalu hapus pelanggan dari `/sales/customers` → tidak lagi gagal karena `params`.
12. Simpan produk dengan harga jual 0; lalu cek respons `/api/products` sebagai kasir → tidak ada `costPrice`.
13. Import file dengan lebih dari 100 baris error → UI menampilkan total error sebenarnya.

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

- Edit kategori via modal sudah tersedia (nama dan induk); manajemen tree inline tanpa modal belum.
- Pencegahan siklus dan pesan error sudah ada di API; UI menampilkan pesan server, validasi inline belum.
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
5. Import. Jika ada error, modal akan menampilkan nomor baris dan penyebabnya; jika error lebih dari 100 baris, total error sebenarnya tetap ditampilkan. Tidak ada data yang tersimpan sebagian.

---

## 8. Catatan Tenancy

Saat ini `Product`, `Category`, `Location`, dan `User` tidak memiliki `tenantId`, `storeId`, atau `ownerId`. Artinya:

- Semua pengguna dengan izin `products.view` melihat katalog yang sama.
- Semua pengguna dengan izin `products.update` dapat mengubah produk mana pun.
- Service Worker juga meng-cache `/api/products` dan `/api/categories` per URL, bukan per pengguna.

Jika aplikasi memang satu database untuk banyak pelanggan, tenancy harus ditambahkan sebelum integrasi Jubelio. Jika satu deployment/DB per pelanggan, isolasi bersifat infrastruktur dan perlu dinyatakan eksplisit.
