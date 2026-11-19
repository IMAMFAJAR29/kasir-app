# Checklist Review Perubahan AI

Dipakai **setiap kali** agent selesai mengerjakan task, sebelum commit.
Tujuannya bukan membuat review sempurna, tapi menangkap kesalahan mahal lebih awal.

Terakhir diperbarui: 19 November 2026

---

## 0. Aturan dasar (berlaku sebelum membaca kode)

- [ ] Diff **≤ ~200 baris** dan hanya menyentuh file yang relevan dengan task.
- [ ] Satu commit = satu tujuan. Tidak ada "sekalian rapihin" di commit fitur.
- [ ] Agent sudah menjelaskan rencananya **sebelum** menulis kode.
- [ ] Kamu sudah membaca **100% diff**, bukan hanya file yang "kelihatan penting".
- [ ] `npm run check` lolos di mesinmu sendiri (jangan percaya klaim agent).
- [ ] Tidak ada dependency baru tanpa alasan tertulis.

Kalau salah satu gagal → **tolak dan minta ulang**, jangan "nanti dibenerin".

---

## 1. Scope & keamanan

- [ ] File yang berubah sesuai daftar rencana. Tidak ada file tak terkait.
- [ ] Tidak ada `console.log` baru yang membocorkan data sensitif.
- [ ] Tidak ada secret/URL/credential yang di-hardcode.
- [ ] Endpoint baru memakai `getServerSession` + `hasPermission(...)`.
- [ ] Data milik user lain tidak bisa diakses (cek `userId`/`role` di query, bukan hanya di UI).
- [ ] `middleware.ts` tidak dilemahkan tanpa alasan.
- [ ] Input divalidasi di server, bukan hanya di form.

## 2. Stok (paling sering salah)

- [ ] Mutasi stok memakai helper di `lib/productStock.ts`, bukan `update` manual.
- [ ] `ProductStock` (per lokasi) dan `Product.stock` (cache) sama-sama benar.
- [ ] Mutasi berada di dalam transaksi yang sama dengan `Sale`/`Invoice`.
- [ ] Stok tidak bisa negatif.
- [ ] Alur faktur **tidak** memakai `allowOtherLocations: true`.
- [ ] Edit/hapus transaksi mengembalikan stok dengan jumlah yang benar.
- [ ] Setelah perubahan: query integritas di `docs/flows/stock-decrement.md` bagian 6 = 0 baris.

## 3. Uang & akuntansi

- [ ] Total dihitung di server, bukan dipercaya dari client.
- [ ] Pembulatan konsisten (integer rupiah vs `Decimal`).
- [ ] `debit` dan `credit` jurnal seimbang.
- [ ] Kode akun yang dipakai ada di COA (`prisma/seed.ts`).
- [ ] Diskon, pajak, ongkir tidak dobel hitung.
- [ ] HPP memakai `costPrice` pada saat transaksi (bukan harga terkini yang berubah).

## 4. Next.js 15 & Prisma

- [ ] Route dinamis: `const { id } = await context.params` (bukan `context.params.id` langsung).
- [ ] `NextResponse.json` mengembalikan status yang benar (200/201/400/401/403/404/409/500).
- [ ] Error Prisma dipetakan (`P2002` duplikat, `P2003` relasi, `P2025` tidak ditemukan).
- [ ] Query list punya batas/`take` (hindari ambil seluruh tabel).
- [ ] `await` tidak hilang (terutama di dalam `$transaction`).
- [ ] Tidak menambah `any` baru; kalau terpaksa, beri komentar alasannya.
- [ ] Migration baru ada dan bisa dijalankan (`prisma migrate dev`), bukan hanya `db push`.

## 5. UI (secukupnya)

- [ ] Error dari API ditampilkan ke user, bukan hanya `console.error`.
- [ ] Loading state ada; tombol tidak bisa diklik dua kali saat request berjalan.
- [ ] Form mengirim payload yang sama dengan yang divalidasi server.
- [ ] Tidak ada optimistic update untuk operasi uang/stok tanpa rollback.
- [ ] Tidak merombak styling di luar task.

---

## 6. Cara verifikasi manual (5–10 menit)

Jangan hanya membaca diff. Lakukan ini:

1. Jalankan `npm run dev`.
2. Ulangi **happy path** yang disentuh task.
3. Ulangi **1 kasus gagal** (input kosong, qty berlebih, akses user lain).
4. Cek Network tab: status code dan response sesuai harapan.
5. Cek Prisma Studio: data berubah seperti yang dijanjikan.
6. Kalau menyentuh stok: jalankan query integritas.

Kalau tidak bisa menjelaskan cara verifikasinya, berarti belum boleh commit.

---

## 7. Contoh komentar review yang baik

Buruk:
> "Kayaknya oke."

Baik:
> "Di `PUT /api/invoices/[id]`, stok dikembalikan pakai `items` dari body, bukan dari DB. Kalau client mengirim qty berbeda, stok bisa bertambah salah. Tolong ambil item lama dari `invoice.items` di dalam transaksi."

Buruk:
> "Benerin dong."

Baik:
> "Checkout 200 tapi `ProductStock` tidak berubah. Payload: `{productId: 12, qty: 1}`. Breakpoint di `decrementStockAtLocation` tidak terpanggil. Dugaan: `locationId` null karena `defaultLocation` tidak ketemu. Cek `Location.isActive`."

Semakin spesifik buktinya (payload, status, query), semakin cepat perbaikannya.

---

## 8. Kapan harus menolak (tanpa diskusi panjang)

- Menyentuh auth/permission tanpa diminta.
- Mengubah schema/migration tanpa rencana rollback.
- Menghapus data atau menambah `deleteMany` di jalur transaksi.
- Menambah dependency besar untuk masalah kecil.
- Diff > 400 baris untuk task kecil.
- "Refactor" file yang tidak berhubungan dengan task.
- Test dimatikan/dilewati agar build lolos.

---

## 9. Template instruksi ke agent

Gunakan ini di awal task:

```
Sebelum menulis kode:
1. Sebutkan file yang akan diubah dan alasannya.
2. Sebutkan risiko utama (stok, uang, auth, migration).
3. Tunggu persetujuan saya.

Aturan:
- Diff maksimal ~150 baris.
- Jangan menyentuh file di luar daftar.
- Jangan menambah dependency.
- Sertakan cara verifikasi manual (happy path + 1 kasus gagal).
- Setelah selesai, tunjukkan ringkasan diff per file.
```
