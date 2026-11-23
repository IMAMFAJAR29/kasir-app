# Alur: Produk Bundle (BOM)

Produk bundle dijual sebagai **satu SKU**, tetapi tidak punya stok sendiri.
Stoknya dihitung dari stok komponen, dan penjualan memotong stok komponen.

Terakhir diperbarui: 23 November 2026

---

## 1. Model data

```
bom                     (1 baris = 1 produk bundle)
  ├── productId  -> Product.id   (unique, penanda bundle)
  └── bom_component
        ├── componentProductId -> Product.id   (wajib produk satuan)
        └── quantity  (unit komponen per 1 bundle)

invoice_items.components  (JSONB)
  snapshot [{ productId, qty }] total per baris faktur
```

- **Tidak ada** kolom flag `isBundle` di `Product`. Bundle dikenali dari ada/tidaknya baris `bom`.
- `Product.stock` dan `ProductStock` untuk produk bundle **selalu 0 / kosong**.
- Produk bundle juga punya `price` sendiri (harga jual diisi admin), tidak dihitung dari komponen.

## 2. Peta cepat

```
Katalog admin (/admin/products)
  POST/PUT /api/products[/[id]]
    parseBundleFields()            lib/bomInput.ts
    validateBundleComponents()     (produk ada, bukan bundle lain, bukan diri sendiri)
    tx.bom.create / deleteMany+create
    stok: bundle -> selalu 0, tanpa applyProductStockChange

Baca katalog (admin, POS, faktur)
  GET /api/products
    include bom + components
    toProductResponse()            lib/bom.ts
      stock bundle = computeBundleStock(...)   <-- STOK DERIVED DI SINI
  GET /api/warehouse/stock?locationId=
    stok bundle = min(floor(stok komponen di lokasi / qty))

POS (/pos)
  POST /api/sales
    createSale() -> prisma.$transaction
      +--> loadBundleMap(tx, productIds)        lib/bom.ts
      +--> explodeItems(items, bundleMap)       bundle -> komponen, digabung per produk
      +--> decrementStockAtLocation() per komponen   <-- STOK TURUN DI SINI
      +--> HPP = SUM(costPrice komponen x qty komponen) x qty bundle

Faktur (/invoices)
  POST /api/invoices
    loadBundleMap() + snapshot komposisi ke invoice_items.components
    processInvoiceAccounting()
      +--> explodeItems() (atau consumption yang dikirim route)
      +--> decrementStockAtLocation() per komponen (lokasi ketat)
  PUT /api/invoices/[id]
    restore stok dari snapshot lama -> incrementStockAtLocation
    snapshot baru untuk item baru -> simpan lagi
  DELETE /api/invoices/[id]
    restore stok dari snapshot -> incrementStockAtLocation
```

## 3. Titik masuk (entry point)

| Aksi pengguna | Route | Perilaku bundle |
|---|---|---|
| Buat/edit produk bundle | `POST/PUT /api/products[/[id]]` | Membuat/mengganti `bom` + komponen; `stock` ditolak jika > 0 |
| Jual di POS | `POST /api/sales` | `SaleItem` mencatat SKU bundle, stok komponen yang berkurang |
| Buat faktur | `POST /api/invoices` | Snapshot komposisi disimpan, komponen berkurang |
| Edit faktur | `PUT /api/invoices/[id]` | Restore dari snapshot lama, potong snapshot baru |
| Hapus faktur | `DELETE /api/invoices/[id]` | Restore dari snapshot |
| Penyesuaian stok | `POST /api/warehouse/adjustments` | **Ditolak** (400) untuk produk bundle |
| Selesaikan penerimaan barang | `POST /api/purchases/receipts/[id]` | **Ditolak** (400) untuk produk bundle |
| Hapus produk yang jadi komponen | `DELETE /api/products/[id]` | **Ditolak** (409) dengan daftar SKU bundle pemakai |
| Konversi produk satuan -> bundle | `PUT /api/products/[id]` dengan `isBundle: true` | Boleh meski masih ada stok; **ditolak jika sudah punya transaksi** atau masih dipakai sebagai komponen bundle lain. Stok bundle langsung mengikuti komposisi. |

## 4. Invariant

1. Produk bundle tidak punya baris `ProductStock` dan `Product.stock` = 0.
2. Stok bundle = `min(floor(stokKomponen_k / qty_k))`, minimal 0, dihitung saat dibaca.
3. Komponen wajib produk satuan (bukan bundle), bukan produk itu sendiri, `quantity` integer >= 1.
4. Penjualan memotong stok **komponen** dalam transaksi yang sama dengan `Sale`/`Invoice`.
5. Restore stok faktur memakai **snapshot** saat faktur dibuat, bukan BOM terkini.
6. Hapus produk bundle ikut menghapus `bom` + `bom_component` (cascade).

## 5. Fungsi kunci (`lib/bom.ts`)

| Fungsi | Tugas |
|---|---|
| `loadBundleMap(db, productIds)` | Ambil komposisi + `costPrice` + nama komponen dalam satu query |
| `computeBundleStock(components, availableByProductId)` | Stok turunan bundle |
| `explodeItems(items, bundleMap)` | Bundle -> konsumsi komponen, digabung per productId |
| `restoreItemsToConsumption(items)` | Konsumsi untuk restore faktur dari snapshot |
| `toProductResponse(product, available)` | Bentuk respons API seragam (`isBundle`, `bundleComponents`, `stock`) |
| `parseBundleFields`, `validateBundleComponents` | Validasi input BOM (`lib/bomInput.ts`) |

## 6. Mode kegagalan yang perlu dicurigai

| Gejala | Kecurigaan |
|---|---|
| Stok bundle tidak turun setelah penjualan | Wajar: stok bundle derived. Periksa stok **komponen**. |
| 409 "stok tidak cukup" saat jual bundle | Komponen kurang; pesan menyebut nama komponen. |
| Stok komponen tidak kembali setelah faktur dihapus | `invoice_items.components` kosong (faktur lama) -> fallback ke `productId`/`qty`. |
| Stok produk berubah saat dijadikan bundle | Wajar: baris `ProductStock` lama dihapus dan stok bundle kini derived dari komponen. Guard konversi hanya memeriksa riwayat transaksi, bukan stok. |
| `npm run db:check-stock` menandai bundle | Bundle punya `Product.stock` != 0 atau baris `ProductStock`. |
| Bundle tidak muncul pilihan komponennya di form | Picker menyembunyikan produk bundle (anti nested) dan produk itu sendiri. |

## 7. Verifikasi manual

1. Produk A stok 5, B stok 10. Bundle A+B qty 1 masing-masing -> stok bundle terbaca 5.
2. Jual 1 bundle di POS -> stok A 4, B 9; `SaleItem` berisi SKU bundle.
3. Komposisi A x10, jual 1 bundle -> stok A turun 10.
4. Oversell -> 409, pesan menyebut komponen.
5. Faktur bundle, ubah BOM, hapus faktur -> stok kembali sesuai snapshot.
6. `POST /api/products` bundle dengan `stock > 0` -> 400.
7. Penyesuaian stok / penerimaan barang untuk bundle -> 400.
8. Hapus produk komponen -> 409.
