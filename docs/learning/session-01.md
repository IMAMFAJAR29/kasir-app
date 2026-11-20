# Sesi 01 — ____ / ____ / 2026

**Lingkungan:** `localhost:3000` + database production (Neon).
**Status data:** transaksi ini adalah **data uji**. Catat ID-nya di bawah.

> Aturan sesi ini: hanya **menambah** data (checkout normal).
> Jangan menghapus, jangan migrate, jangan seed.

---

## Tujuan

Membuktikan satu alur utuh:

```
Klik "Bayar"  ->  POST /api/sales  ->  data tersimpan  ->  stok berkurang
```

---

## Persiapan (5 menit)

- [ ] `npm run dev` jalan **tanpa** F5 / debugger
- [ ] Terminal lain: `npm run db:studio`
- [ ] Pilih 1 produk yang stoknya > 0
- [ ] Catat kondisi **sebelum**:

| Data | Nilai sebelum |
|---|---|
| Nama produk | |
| `Product.id` | |
| `Product.stock` | |
| `ProductStock.quantity` (lokasi default) | |
| `Location.id` | |

---

## Lakukan checkout (10 menit)

- [ ] Tutup tab `/pos`, buka tab baru `http://localhost:3000/pos`
- [ ] Login (kasir/admin)
- [ ] Pastikan shift kasir terbuka
- [ ] Pilih 1 produk, qty 1
- [ ] Bayar → **Cash** → uang pas / lebih → konfirmasi

---

## Ambil bukti (15 menit)

### A. Network tab

DevTools → Network → filter `sales` → klik request `POST /api/sales`.

| Yang dicek | Hasil |
|---|---|
| Status | ____ (harus `201`) |
| Payload `items` | ____ |
| Payload `method` | ____ |
| Response `id` | ____ |

### B. Modal & struk

- [ ] Modal hijau **"Transaksi Berhasil"** muncul
- [ ] Klik **Cetak Struk** → tab struk terbuka
- [ ] Dialog print muncul (boleh dibatalkan)

### C. Database (Prisma Studio)

Refresh tabel di Prisma Studio, lalu isi:

| Data | Nilai sesudah | Perubahan |
|---|---|---|
| `Product.stock` | | turun 1 |
| `ProductStock.quantity` | | turun 1 |
| `transactions` (ID baru) | | +1 baris |
| `transaction_items` | | +1 baris |
| `Invoice` (`saleId` sama) | | +1 baris |
| `JournalEntry` | | +1 baris (jika COA ada) |

**ID transaksi uji (catat di sini):** ____________________

### D. Cek konsistensi (opsional tapi disarankan)

```bash
npm run db:check-stock
```

Hasil yang benar:

```
Produk diperiksa: N
OK: Product.stock dan ProductStock konsisten.
```

Kalau muncul daftar produk, berarti ada stok yang tidak sinkron — catat sebagai temuan.

---

## Tiga baris catatan (wajib)

**1. Apa yang saya lakukan:**
____

**2. Bukti yang saya lihat:**
____

**3. Yang masih bingung / langkah berikutnya:**
____

---

## Kalau ada yang tidak sesuai

| Gejala | Cek dulu |
|---|---|
| Status bukan `201` | isi Response + pesan error di modal |
| Modal tidak muncul, browser diam | terminal `npm run dev` dan Network tab |
| Stok tidak berubah | `ProductStock` vs `Product.stock` di Studio |
| Struk tidak terbuka | popup diblokir browser |
| Error 409 | shift kasir atau stok |

Jangan menebak. Tulis: **yang dilakukan, yang diharapkan, yang terjadi, buktinya.**
