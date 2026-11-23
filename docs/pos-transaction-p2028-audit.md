# Audit Transaksi POS — P2028 "Transaction not found"

Tanggal: 23 November 2026
Status: **sudah diperbaiki** (belum di-commit)

## Gejala

Menekan "Selesaikan Pembayaran" di POS gagal dengan pesan
**"Gagal menyimpan transaksi"**. Log Vercel:

```
Gagal membuat transaksi POS: Error [PrismaClientKnownRequestError]:
Invalid `prisma.productStock.aggregate()` invocation:
Transaction API error: Transaction not found...
    at async i (.next/server/app/api/sales/route.js:1:18685)
code: "P2028"
```

## Akar Masalah

**Batas waktu transaksi Prisma (default 5 detik) terlampaui.**

`prisma.$transaction(async (tx) => ...)` adalah *interactive transaction*.
Prisma memberi batas `timeout: 5000` ms untuk seluruh isi transaksi.
Kalau terlampaui, Prisma membuang transaksi dan setiap query berikutnya
gagal dengan P2028 — persis pesan "Transaction not found".

`createSale()` di `app/api/sales/route.js` menjalankan **26 round trip
berurutan** di dalam satu transaksi. Diukur langsung ke database produksi
(dari mesin lokal), totalnya 1.630 ms:

| # | Query | Waktu |
|---|---|---|
| 1 | `BEGIN` | 25 ms |
| 2-3 | cek cash session + lokasi default | ~50 ms |
| 4-8 | `sale.create` + item + relasi | ~55 ms each |
| 9-11 | `invoice.create` + item | ~55 ms each |
| 12 | `productStock.findUnique` (`ensureLocationStock`) | 115 ms |
| 13 | `productStock.updateMany` (decrement) | 91 ms |
| 14 | `productStock.aggregate` ← **titik error di log** | 60 ms |
| 15 | `product.update` (cache stok) | 92 ms |
| 16-19 | ulangi 12-15 untuk item kedua | ~230 ms |
| 20-25 | cek jurnal + 4× lookup akun COA + nomor jurnal | ~430 ms |
| 26 | `ROLLBACK` | 52 ms |

Angka 1.630 ms itu dari mesin lokal. Di Vercel, function berjalan di
**`iad1` (Washington DC)** sedangkan database Neon ada di
**`ap-southeast-1` (Singapura)** — lihat host `...-pooler.ap-southeast-1.aws.neon.tech`.
Latensi lintas benua ±200–250 ms per round trip, jadi 26 round trip
menjadi **±5–6,5 detik** → melewati batas 5 detik.

Bukti reproduksi terkontrol pada database produksi:

```
default(5s timeout), hold 4s: OK     in 4728 ms
default(5s timeout), hold 6s: FAILED in 6101 ms -> P2028
timeout=20s, hold 6s:         OK     in 6121 ms
```

Dan simulasi alur `createSale()` dengan latensi 300 ms/round trip:

```
OLD (default 5s)  @300ms/trip -> FAILED in 5294 ms: P2028
NEW (20s timeout) @300ms/trip -> SUCCESS in 5026 ms
```

Ini juga menjelaskan kenapa munculnya tidak konsisten: transaksi dengan
1 item biasanya lolos, transaksi dengan beberapa item (apalagi saat DB
sedang "cold start" setelah idle) melewati batas.

Bukan penyebabnya:

- Chart of Accounts **lengkap** (16 akun, semua kode yang dipakai ada:
  `1-1001`, `1-1002`, `1-1003`, `1-1300`, `4-1000`, `5-1000`).
- Stok tidak kurang; kalau kurang, errornya `INSUFFICIENT_STOCK` (409).
- Query `productStock.aggregate` sendiri sehat — ia hanya korban pertama
  setelah transaksi dibuang.

## Perbaikan

### 1. `lib/prisma.ts` — konstanta timeout transaksi

```ts
export const TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;
```

`maxWait` = batas menunggu koneksi dari pool, `timeout` = batas total
isi transaksi. 20 detik memberi ruang untuk latensi lintas region,
tapi tetap membatasi agar transaksi tidak menggantung selamanya.

### 2. Semua transaksi interaktif memakai opsi itu

Diterapkan ke **10 transaksi** agar bug yang sama tidak muncul di alur lain:

- `app/api/sales/route.js` (POS — sumber error)
- `app/api/invoices/route.ts`, `app/api/invoices/[id]/route.ts` (update + hapus),
  `app/api/invoices/[id]/status/route.ts`
- `app/api/purchases/receipts/[id]/route.ts`
- `app/api/warehouse/adjustments/route.ts`
- `app/api/products/route.ts`, `app/api/products/[id]/route.ts` (update + hapus)

(`app/api/products/import/route.ts` memang sudah punya `timeout: 120000`
sendiri, jadi tidak diubah.)

### 3. `ensureDefaultAccountsExist` menerima client transaksi

Sebelumnya fungsi ini selalu memakai `prisma` global, padahal dipanggil
dari `getAccountIdByCode()` yang bisa berjalan **di dalam** transaksi.
Artinya ia memakai koneksi lain sementara transaksi utama masih terbuka —
memperbesar risiko timeout dan, pada pool kecil (Neon pooler), bisa
saling menunggu. Sekarang menerima `tx`:

```ts
export async function ensureDefaultAccountsExist(
  tx: Prisma.TransactionClient | typeof prisma = prisma
)
```

### 4. `vercel.json` — region function disamakan dengan database

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"]
}
```

Ini menyerang penyebab utamanya: memangkas latensi per round trip dari
±200–250 ms (lintas benua) menjadi ±1–5 ms (satu region). Setelah ini,
transaksi POS normal kembali jauh di bawah 1 detik.

**Perlu diverifikasi setelah deploy:** buka Vercel → Project → Settings →
Functions, pastikan region aktif `sin1`. Kalau paket Hobby, hanya boleh
satu region — `sin1` sudah satu region, jadi aman. Kalau dashboard
menyetel region lain, `vercel.json` yang menang.

## Verifikasi

| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| `npx tsc --noEmit` | 0 error | 0 error |
| `npx next lint` | 6 warning | 6 warning (tidak berubah) |
| `npm run build` | exit 0 | exit 0, 51 halaman |
| Simulasi 26 round trip @5s | P2028 | sukses |

## Sisa pekerjaan (belum dikerjakan)

Urut dari yang paling berdampak:

1. **Kurangi jumlah round trip** (perbaikan struktural, bukan tambal).
   Kandidat termurah:
   - `recalculateProductStock` memanggil `aggregate` **per item**. Untuk
     keranjang 5 item = 5 aggregate. Bisa dikumpulkan per `productId` unik
     lalu satu query `groupBy`.
   - Lookup 4 akun COA per transaksi bisa di-*batch* jadi satu
     `findMany({ where: { code: { in: [...] } } })`, bukan 4× `findUnique`.
   - `generateEntryNumber` melakukan `findFirst` terpisah; bisa digabung.
   Target: dari 26 round trip menjadi ±12.
2. **Cache `accountCache` tidak pernah di-invalidate.** Kalau akun dihapus
   atau ID berubah, cache bisa menyimpan ID basi. Saat ini aman karena ID
   akun adalah UUID yang tidak berubah, tapi perlu dicatat.
3. **Idempotensi sisi klien.** `handlePay()` membuat `clientTransactionId`
   baru setiap kali ditekan. Kalau percobaan pertama sebenarnya sudah
   commit tapi response-nya hilang, retry akan membuat **duplikat** karena
   UUID-nya berbeda. Perlu disimpan per-keranjang, bukan per-tekan.
4. **`app/api/sales/route.js` masih `.js`** — menyulitkan review (sudah
   tercatat di `docs/flows/stock-decrement.md` §10).
5. **Belum ada test otomatis** untuk alur checkout. Ini regresi yang
   seharusnya tertangkap test integrasi.

## Catatan

Transaksi yang gagal **sudah di-rollback dengan benar** oleh Prisma, jadi
tidak ada `Sale` setengah jadi maupun stok yang terlanjur berkurang.
Kasir cukup mengulang pembayaran.
