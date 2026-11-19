# Alur: Stok Berkurang (POS & Faktur)

Dokumen ini adalah peta alur yang paling penting di aplikasi ini.
Kalau stok terlihat salah, mulai dari sini.

Terakhir diperbarui: 19 November 2026

---

## 1. Peta cepat

```
POS (/pos)
  app/pos/page.tsx
    checkout langsung .................. baris ~649
    sync transaksi offline ............. baris ~200
        |
        v
  POST /api/sales
  app/api/sales/route.js
    createSale()
        |
        +--> prisma.$transaction
               |
               +--> tx.sale.create + tx.invoice.create
               |
               +--> decrementStockAtLocation()  <-- STOK TURUN DI SINI
               |      lib/productStock.ts
               |        +--> ensureLocationStock()
               |        +--> tx.productStock.updateMany(decrement)
               |        +--> recalculateProductStock()
               |               +--> tx.product.update({ stock: SUM(ProductStock) })
               |
               +--> postJournalEntry()  (lib/accounting/postingService.ts)

Faktur (/invoices, /admin/...)
  POST /api/invoices
    processInvoiceAccounting()  (lib/accounting/invoiceAccounting.ts)
      +--> decrementStockAtLocation()  (lokasi ketat, tanpa allowOtherLocations)
      +--> postJournalEntry()

Penerimaan barang (purchases/receiving)
  POST /api/purchases/receipts/[id]  (aksi complete)
      +--> incrementStockAtLocation()

Penyesuaian stok (warehouse/stock)
  POST /api/warehouse/adjustments
      +--> getLocationStockQuantity() + setStockAtLocation()

Edit/hapus produk
  POST/PUT /api/products, PUT /api/products/[id]
      +--> applyProductStockChange()  (delta, bukan timpa total)
```

## 2. Titik masuk (entry point)

| Aksi pengguna | Route | Fungsi stok yang dipanggil |
|---|---|---|
| Bayar di POS | `POST /api/sales` | `decrementStockAtLocation(..., allowOtherLocations: true)` |
| Buat/edit/hapus faktur | `POST/PUT/DELETE /api/invoices` | `decrementStockAtLocation` / `incrementStockAtLocation` |
| Selesaikan penerimaan barang | `POST /api/purchases/receipts/[id]` | `incrementStockAtLocation` |
| Penyesuaian stok | `POST /api/warehouse/adjustments` | `setStockAtLocation` |
| Create/update produk | `POST /api/products`, `PUT /api/products/[id]` | `applyProductStockChange` |

## 3. Fungsi kunci (`lib/productStock.ts`)

| Fungsi | Tugas | Catatan debug |
|---|---|---|
| `getDefaultLocationId(tx)` | Ambil lokasi aktif pertama | Dipakai sebagian route; `app/api/sales/route.js` menduplikasi query ini secara inline |
| `ensureLocationStock(tx, ...)` | Pastikan baris `ProductStock` ada | Produk legacy: `Product.stock` di-seed ke lokasi target **hanya jika belum punya baris sama sekali** |
| `decrementStockAtLocation(tx, ...)` | Kurangi stok per lokasi | Cek `allowOtherLocations`; kalau `false` dan stok lokasi kurang → `InsufficientStockError` |
| `incrementStockAtLocation(tx, ...)` | Tambah stok per lokasi | Dipakai penerimaan barang & pembatalan faktur |
| `setStockAtLocation(tx, ...)` | Set jumlah absolut | Dipakai penyesuaian stok (opname) |
| `applyProductStockChange(tx, ...)` | Ubah total stok dengan delta | Dipakai create/update produk; **bukan** untuk POS |
| `recalculateProductStock(tx, ...)` | `Product.stock = SUM(ProductStock.quantity)` | Kalau angka total aneh, cek apakah fungsi ini terpanggil |

## 4. Invariant (aturan yang harus selalu benar)

1. **`ProductStock` adalah sumber kebenaran** jumlah stok per lokasi.
2. **`Product.stock` hanya cache** dari `SUM(ProductStock.quantity)`.
3. Stok **tidak boleh negatif**. Pelanggaran harus melempar `InsufficientStockError` (HTTP 409).
4. POS memakai **lokasi default** dan boleh mengambil dari lokasi lain (`allowOtherLocations: true`).
5. Faktur **ketat per lokasi** — stok tidak boleh berpindah gudang tanpa sengaja.
6. Semua mutasi stok harus berada di dalam `prisma.$transaction` yang sama dengan pembuatan `Sale`/`Invoice`. Kalau stok gagal, transaksi harus rollback.

## 5. Titik breakpoint yang harus dipasang

Pasang breakpoint di urutan ini, lalu checkout 1 item dari POS:

| # | File | Lokasi | Yang dilihat |
|---|---|---|---|
| 1 | `app/pos/page.tsx` | di sekitar `fetch("/api/sales")` (~baris 649) | payload `items`, `method`, `payment`, `cashSessionId` |
| 2 | `app/api/sales/route.js` | awal `createSale()` | `body`, `userId`, validasi mana yang lolos |
| 3 | `app/api/sales/route.js` | di dalam `prisma.$transaction` | `defaultLocation.id`, `createdSale.id` |
| 4 | `lib/productStock.ts` | dalam `decrementStockAtLocation` | `productId`, `locationId`, `qty`, hasil `updated.count` |
| 5 | `lib/productStock.ts` | dalam `recalculateProductStock` | `aggregate._sum.quantity` sebelum update |

Di VS Code: panel **Run and Debug** → pilih `Next.js: server (breakpoint di API/lib)` → F5 → buka `/pos` → lakukan checkout.

## 6. Bukti di database

Jalankan `npm run db:studio`, lalu bandingkan sebelum dan sesudah checkout:

Tabel `ProductStock` (per lokasi):

```
productId | locationId | quantity
```

Tabel `Product` (cache total):

```
id | sku | stock
```

SQL ekuivalen:

```sql
-- stok per lokasi
SELECT "productId", "locationId", quantity
FROM "ProductStock"
WHERE "productId" = 1;

-- cache total
SELECT id, sku, stock FROM "Product" WHERE id = 1;

-- cek konsistensi semua produk (harus 0 baris)
SELECT p.id, p.sku, p.stock, COALESCE(SUM(ps.quantity), 0) AS total_lokasi
FROM "Product" p
LEFT JOIN "ProductStock" ps ON ps."productId" = p.id
GROUP BY p.id, p.sku, p.stock
HAVING p.stock <> COALESCE(SUM(ps.quantity), 0);
```

Query terakhir adalah **tes integritas**. Kalau mengembalikan baris, ada stok yang tidak sinkron.

## 7. Mode kegagalan yang umum

| Gejala | Kecurigaan utama | Cek di mana |
|---|---|---|
| Checkout sukses (200) tapi stok tidak turun | `decrementStockAtLocation` tidak terpanggil, atau `locationId` null | breakpoint #4, payload #3 |
| `Product.stock` turun tapi `ProductStock` tidak | `recalculateProductStock` terpanggil tanpa update baris lokasi | breakpoint #5 + query integritas |
| Error 409 "stok tidak cukup" padahal stok ada | stok ada di lokasi lain, tapi `allowOtherLocations` false (alur faktur) | cek `ProductStock` per lokasi |
| Error 500 saat checkout | exception di dalam transaksi (journal/COA tidak lengkap) | log server, cek `postJournalEntry` |
| Stok turun dua kali untuk satu transaksi | retry tanpa `clientTransactionId` yang sama, atau sync offline ganda | tabel `transactions.clientTransactionId` |
| Edit produk mereset stok ke 0 | field stok terkirim kosong dari form | payload `PUT /api/products/[id]` |

## 8. Latihan "sengaja rusak" (minggu 2)

Di branch terpisah (`learn/break-stock`), **di database lokal/branch Neon**:

1. Di `decrementStockAtLocation`, ubah sementara `updated.count === 1` menjadi `updated.count >= 0` agar error tidak dilempar.
2. Checkout qty melebihi stok.
3. Amati: transaksi tetap dibuat, stok jadi negatif.
4. Kembalikan kode, ulangi, pastikan 409 kembali.
5. Tulis temuan di bagian bawah dokumen ini.

Tujuan latihan: kamu melihat sendiri **titik mana** yang menjaga integritas, bukan menghafal nama fungsi.

## 9. Checklist setelah memperbaiki bug stok

- [ ] `npm run check` lolos.
- [ ] Query integritas di bagian 6 mengembalikan 0 baris.
- [ ] Checkout normal masih berhasil.
- [ ] Checkout melebihi stok mengembalikan 409 dan **tidak** membuat `Sale`.
- [ ] `ProductStock` dan `Product.stock` sama setelah transaksi.
- [ ] Jurnal akuntansi tetap terbentuk (kalau alur menyentuh akuntansi).

## 10. Catatan review (belum diperbaiki, jangan diubah dulu)

- `app/api/sales/route.js` menduplikasi query lokasi default yang sudah ada di `getDefaultLocationId()`. Ini kandidat konsolidasi minggu 7–8.
- `app/api/sales/route.js` masih `.js` (tanpa tipe), padahal mayoritas route sudah `.ts`. Ini menyulitkan review, bukan bug.
- Perhitungan HPP di route POS mengambil `costPrice` dari `createdSale.items[].product`; kalau `costPrice` berubah setelah transaksi, histori tidak berubah — perlu dipahami sebelum menambah fitur laporan.
