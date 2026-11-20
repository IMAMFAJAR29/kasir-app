# Rencana Belajar — Metode 3 Lapis

Dibuat: 20 November 2026
Untuk: pemilik proyek `pos-app` (vibe coding → paham & bisa debug)

---

## 1. Kenapa metode ini

Belajar dari seluruh codebase (22.800 baris) adalah cara tercepat untuk menyerah.
Yang dibutuhkan bukan "tahu semua kode", tapi **tahu di mana harus melihat saat ada masalah**.

Metode 3 Lapis = setiap fitur dipelajari lewat tiga lapisan yang sama:

```
UI (yang kamu klik)
   -> API (request/response)
      -> DATABASE (data yang berubah)
```

Setiap sesi hanya menggarap **satu alur**, dan harus menghasilkan **satu bukti**.

---

## 2. Prinsip (5 aturan)

1. **Satu alur per sesi.** Bukan "belajar modul produk", tapi "apa yang terjadi saat klik bayar".
2. **Bukti, bukan perasaan.** Selesai sesi = ada screenshot/status/baris DB, bukan "kayaknya paham".
3. **Baca hanya file yang dilewati alur.** Tidak perlu membuka folder lain.
4. **Mode terpisah.** "Mode Pakai" (mencoba fitur) dan "Mode Bedah" (menghentikan program) tidak boleh dicampur.
5. **AI menjelaskan dulu, bukan langsung koding.** Selama sesi belajar, AI berperan sebagai pemandu, bukan tukang.

---

## 3. Ritme satu sesi (40 menit)

| Menit | Aktivitas |
|---|---|
| 0–5 | Baca catatan sesi sebelumnya (3 baris) |
| 5–15 | Baca alur: buka 2–3 file yang disebut di peta |
| 15–35 | Lakukan aksi + ambil bukti (Network / terminal / Prisma Studio) |
| 35–40 | Tulis 3 baris catatan sesi |

Kalau waktu habis di tengah: **berhenti**, catat posisi. Jangan lanjut dengan tergesa-gesa.

---

## 4. Tangga alat (jangan melompat)

| Level | Alat | Kapan |
|---|---|---|
| 0 | Browser DevTools (Network), terminal `npm run dev`, Prisma Studio | Minggu 1–2 |
| 1 | `console.log` sementara di server | Minggu 3 |
| 2 | `git diff` + checklist review | Minggu 5 |
| 3 | Breakpoint VS Code (satu titik, fungsi terpisah) | Minggu 7 |

Alasan: breakpoint membekukan **seluruh server**. Kalau dipakai sambil mencoba fitur, hasilnya seperti yang terjadi kemarin — browser hang, bukan belajar.

---

## 5. Kurikulum 8 minggu

| Minggu | Tema | Bukti yang harus ada |
|---|---|---|
| 1 | Satu klik jadi data (alur POS) | Network `201` + baris baru di `transactions` |
| 2 | Stok: `ProductStock` vs `Product.stock` | Angka sebelum/sesudah + query integritas 0 baris |
| 3 | Gagal dengan benar (400/403/409, rollback) | Transaksi gagal **tidak** meninggalkan data |
| 4 | Auth & izin (session, middleware, permission) | Kasir ditolak di halaman admin |
| 5 | Membaca diff AI | Satu diff 50–150 baris + 1 temuan |
| 6 | Test pertama (Vitest) | 3 test stok/uang lulus |
| 7 | Debugger dengan aman | 1 breakpoint di fungsi terpisah, app tetap jalan |
| 8 | Refactor kecil dengan test | Test tetap hijau setelah perubahan |

Catatan: **skill debugging dilatih sejak minggu 1** lewat bukti (Network/DB). Yang ditunda hanya **alat debugger**-nya.

---

## 6. Format catatan sesi (wajib, 3 baris)

Simpan di `docs/learning/session-XX.md`:

```md
# Sesi 01 — 20 Nov 2026

Alur: checkout POS tunai
File: app/pos/page.tsx -> app/api/sales/route.js -> lib/productStock.ts
Bukti: POST /api/sales = 201; ProductStock 20 -> 19; transaksi id 123
Bingung: kenapa Product.stock terpisah dari ProductStock?
Next: buktikan recalculateProductStock (minggu 2)
```

Tiga baris itu lebih berharga daripada 3 jam menonton tutorial.

---

## 7. Protokol bertanya ke AI (selama belajar)

Gunakan salah satu dari ini:

- "Jelaskan alur X dari file A ke database. Jangan tulis kode."
- "Beri saya 3 pertanyaan untuk mengecek apakah saya benar-benar paham X."
- "Saya menduga penyebabnya Y. Tunjukkan cara membuktikannya, bukan jawabannya."
- "Review pemahaman saya ini; koreksi yang salah."

Saat meminta perbaikan (bukan belajar):

- "Sebut file yang akan diubah, risikonya, dan cara verifikasi. Diff maksimal 100 baris."
- "Jangan sentuh file di luar daftar."

---

## 8. Aturan macet 15 menit

Kalau buntu lebih dari 15 menit, **berhenti menebak**. Tulis 4 hal:

1. Yang saya lakukan.
2. Yang saya harapkan.
3. Yang terjadi.
4. Bukti (status code / isi response / log / nilai DB).

Lalu tanya AI dengan 4 hal itu. Ini mengubah "tolong benerin" menjadi laporan bug — dan justru di situ kemampuan debugging tumbuh.

---

## 9. Ukuran kemajuan (bukan perasaan)

- [ ] Minggu 1: bisa menggambar alur checkout dari memori.
- [ ] Minggu 2: bisa menjelaskan kenapa `Product.stock` hanya cache.
- [ ] Minggu 3: bisa menebak status code untuk input salah.
- [ ] Minggu 4: bisa menunjukkan layer mana yang menolak akses.
- [ ] Minggu 5: bisa menolak satu diff AI dengan alasan konkret.
- [ ] Minggu 6: bisa menulis test yang gagal lalu dibuat lulus.
- [ ] Minggu 7: bisa memakai satu breakpoint tanpa membekukan app.
- [ ] Minggu 8: bisa refactor kecil dengan test sebagai pengaman.

---

## 10. Larangan selama 8 minggu

- Jangan menambah fitur besar di sela-sela sesi belajar.
- Jangan membaca seluruh repo sekaligus.
- Jangan memakai debugger saat ingin mencoba fitur.
- Jangan menjalankan seed/eksperimen ke database Neon utama.
- Jangan menonton tutorial umum (React/TypeScript) kecuali konsep itu muncul di alur yang sedang dipelajari.

---

## 11. Sesi pertama (hari ini, 30 menit)

Konteks: aplikasi belajar, satu pengguna, data bukan data bisnis nyata.
Boleh memakai `localhost:3000` + database production, dengan aturan **hanya menambah data**.

1. Pastikan `npm run dev` jalan **tanpa** F5/debugger.
2. Catat kondisi produk sebelum checkout (`Product.stock`, `ProductStock.quantity`).
3. Tutup tab `/pos`, buka tab baru, lakukan satu checkout tunai.
4. DevTools → Network → filter `sales` → lihat **Payload** dan **Response** (harus `201`).
5. Jalankan `npm run db:studio` → cek transaksi baru, invoice, dan stok turun.
6. Tandai transaksi itu sebagai **data uji** dan catat ID-nya.
7. Isi `docs/learning/session-01.md`.

Yang **tidak** boleh di production: hapus data, migrate, `db push`, seed, atau eksperimen "sengaja rusak".
Untuk itu, siapkan Neon branch sebelum minggu 3.
