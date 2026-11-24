# Sesi 01 — ____ / ____ / 2026

**Lingkungan:** `localhost:3000` + database Neon
**Status data:** transaksi dari sesi ini adalah **data uji**. Catat ID-nya di bagian bawah.

> **Aturan sesi:**
>
> - Hanya **menambah** data (satu checkout normal).
> - Jangan menghapus data, jangan `migrate`, jangan `db push`, jangan seed.
> - **Jangan pakai debugger / F5.** Jalankan `npm run dev` biasa.
> - Kalau buntu lebih dari 15 menit: berhenti menebak, isi bagian "Laporan macet" di bawah.

---

## Tujuan

Membuktikan satu alur utuh, dengan **menebak dulu, lalu mengecek**:

```
Klik "Bayar"  ->  POST /api/sales  ->  data tersimpan  ->  stok berkurang
```

---

## Langkah 0 — Persiapan (5 menit)

- [ ] `npm run dev` jalan **tanpa** F5 / debugger
- [ ] Terminal kedua: `npm run db:studio`
- [ ] Bisa login ke `http://localhost:3000/pos` (kasir/admin).
      Kalau login gagal, **berhenti** — itu masalah terpisah, catat di "Laporan macet".
- [ ] Jalankan `npm run db:check-stock`, lalu **pilih produk yang tidak muncul di daftar selisih**.
      Kalau semua produk bermasalah, catat selisihnya dulu; jangan diperbaiki di sesi ini.
- [ ] (Disarankan) Buat **Neon branch** untuk belajar, supaya data uji tidak tercampur dengan data utama

---

## Langkah 1 — Tebakan saya (tulis SEBELUM klik Bayar)

Jawab dari pengetahuan yang kamu punya sekarang. **Salah itu boleh dan justru berguna.**

1. Request apa yang dikirim browser, ke URL mana?

   ***

2. Tabel apa saja yang menurut saya akan bertambah atau berubah?

   ***

3. File apa yang menurut saya memproses request itu?

   ***

4. Setelah bayar 1 produk qty 1, `Product.stock` akan menjadi:
   ____ (dari ____)

5. Menurut saya status response-nya:

   ***

6. Seberapa yakin saya (1-5)?
   ***

---

## Langkah 2 — Kondisi SEBELUM checkout

| Data                                     | Nilai sebelum |
| ---------------------------------------- | ------------- |
| Nama produk                              |               |
| `Product.id`                             |               |
| `Product.stock`                          |               |
| `ProductStock.quantity` (lokasi default) |               |
| `Location.id`                            |               |

---

## Langkah 3 — Lakukan checkout (10 menit)

- [ ] Tutup tab `/pos`, buka tab baru `http://localhost:3000/pos`
- [ ] Login (kasir/admin)
- [ ] Pastikan shift kasir terbuka
- [ ] Pilih 1 produk, qty 1
- [ ] Bayar, pilih **Cash**, masukkan uang pas atau lebih, konfirmasi

---

## Langkah 4 — Ambil bukti (15 menit)

### A. Network tab

DevTools → Network → filter `sales` → klik request `POST /api/sales`.

| Yang dicek       | Hasil sebenarnya | Tebakan saya benar? |
| ---------------- | ---------------- | ------------------- |
| Status           |                  |                     |
| Payload `items`  |                  |                     |
| Payload `method` |                  |                     |
| Response `id`    |                  |                     |

### B. Modal dan struk

- [ ] Modal hijau **"Transaksi Berhasil"** muncul
- [ ] Klik **Cetak Struk**, tab struk terbuka
- [ ] Dialog print muncul (boleh dibatalkan)

### C. Database (Prisma Studio)

Refresh tabel di Prisma Studio, lalu isi:

| Data                           | Nilai sesudah | Berubah berapa? | Tebakan saya benar? |
| ------------------------------ | ------------- | --------------- | ------------------- |
| `Product.stock`                |               |                 |                     |
| `ProductStock.quantity`        |               |                 |                     |
| `transactions`                 |               |                 |                     |
| `transaction_items`            |               |                 |                     |
| `Invoice`                      |               |                 |                     |
| `JournalEntry` (kalau ada COA) |               |                 |                     |

> Kalau produk pilihan Anda sudah muncul di `db:check-stock`, selisih itu **temuan lama**, bukan akibat sesi ini. Tulis selisih awalnya di kolom "Nilai sebelum" Langkah 2.

**ID transaksi uji:** ____________________

### D. Cek konsistensi stok (opsional tapi disarankan)

```bash
npm run db:check-stock
```

Hasil yang menandakan konsisten:

```
Produk diperiksa: N
OK: Product.stock dan ProductStock konsisten.
```

Kalau muncul daftar produk, berarti ada stok yang tidak sinkron. Catat sebagai temuan, jangan diperbaiki dulu.

---

## Langkah 5 — Jejak file (10 menit, baca saja, jangan ubah)

Buka hanya file yang dilewati alur ini. Tulis satu kalimat per file dengan kata-katamu sendiri.

| File                     | Peran file ini menurut saya |
| ------------------------ | --------------------------- |
| `app/pos/page.tsx`       |                             |
| `app/api/sales/route.js` |                             |
| `lib/productStock.ts`    |                             |

Lalu cocokkan dengan Tebakan nomor 3: file mana yang tebakanmu benar, mana yang meleset?

---

## Langkah 6 — Tebakan yang meleset

Tulis semua tebakan di Langkah 1 yang ternyata salah, dan apa yang sebenarnya terjadi.

| Tebakan saya | Yang sebenarnya |
| ------------ | --------------- |
|              |                 |
|              |                 |

---

## Tiga baris catatan (wajib)

**1. Apa yang saya lakukan:**

---

**2. Bukti yang saya lihat:**

---

**3. Yang masih bingung / langkah berikutnya:**

---

---

## Tes penutup (tanpa melihat catatan di atas)

Tutup file ini dan kodenya. Di kertas atau kolom kosong di bawah, gambar atau tulis alur checkout dengan kata-katamu sendiri: dari klik Bayar sampai stok berubah. Setelah itu buka kembali dan bandingkan.

Alur versi saya:

---

Bagian yang tadi macet:

---

---

## Laporan macet (isi kalau buntu lebih dari 15 menit)

1. Yang saya lakukan:
   ***
2. Yang saya harapkan:
   ***
3. Yang terjadi:
   ***
4. Bukti (status code / isi response / log / nilai DB):
   ***

---

## Kalau ada yang tidak sesuai

| Gejala                           | Cek dulu                                    |
| -------------------------------- | ------------------------------------------- |
| Status bukan `201`               | isi Response dan pesan error di modal       |
| Modal tidak muncul, browser diam | terminal `npm run dev` dan Network tab      |
| Stok tidak berubah               | `ProductStock` vs `Product.stock` di Studio |
| Struk tidak terbuka              | popup diblokir browser                      |
| Error 409                        | shift kasir atau stok                       |
