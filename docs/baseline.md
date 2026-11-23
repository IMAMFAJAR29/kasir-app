# Baseline Kesehatan Repo

Dibuat: 19 November 2026
Diperbarui: 23 November 2026 (lihat §8)

> **Status:** ini snapshot historis pada commit `cae7f52`. Repo sudah bergerak
> 4 commit dan working tree sedang kotor. Angka di §1 **jangan diubah** — pakai
> §8 untuk membandingkan kondisi sekarang.

Dokumen ini adalah "foto" kondisi repo sebelum sesi belajar/debug dimulai.

Tujuannya: setiap perubahan (termasuk dari AI agent) dibandingkan dengan angka di sini. Kalau ada yang turun, kita tahu persis apa yang rusak.

---

## 1. Kondisi terukur

| Item | Nilai | Status |
|---|---|---|
| Commit | `cae7f52` (branch `main`) | — |
| Node.js | v22.16.0 | OK |
| Next.js | 15.5.27 (App Router) | OK |
| Prisma | 6.14.0, PostgreSQL (Neon) | OK |
| `npx tsc --noEmit` | 0 error | LOLOS |
| `npm run build` | exit 0, compiled 22.8s, 51 halaman | LOLOS |
| `npx next lint` | 6 warning, 0 error | LOLOS (dengan catatan) |
| Test otomatis | 0 file test | BELUM ADA |
| Jumlah file kode | ~141 file, ~22.800 baris | — |
| Route API | 41 (36 `.ts`, 5 `.js`) | campur |
| Model Prisma | 23 | — |

## 2. Peringatan lint yang ada (bukan error)

Semua `react-hooks/exhaustive-deps` kecuali satu `no-img-element`:

1. `app/admin/accounting/journals/page.tsx` — `fetchJournals`
2. `app/admin/accounting/ledger/page.tsx` — `fetchLedger`
3. `app/admin/accounting/reports/page.tsx` — `fetchData`
4. `app/warehouse/stock/page.tsx` — `fetchProducts`
5. `components/pos/ProductList.tsx` — `tryScan`
6. `components/pos/QrisModal.tsx` — `<img>` (disarankan `next/image`)

Peringatan ini **tidak** boleh diabaikan selamanya, tapi bukan prioritas sebelum alur dipahami.

## 3. Cara mengulang baseline

Jalankan dari root repo:

```bash
npx tsc --noEmit
npx next lint
npm run build
npm run check        # tsc + lint (script baru)
```

`npm run build` akan menghapus folder `.next`, jadi jangan menulis log build ke dalam `.next`.

## 4. Aturan baseline

- Setiap task harus lolos `npm run check` **sebelum** dan **sesudah** dikerjakan.
- Kalau angka warning bertambah, itu tanda agent menyentuh file di luar scope.
- Build harus tetap exit 0. Build gagal = perubahan dibatalkan, bukan "nanti dibenerin".
- Jangan menambah dependency baru tanpa dicatat di sini.

## 5. Catatan database (penting)

`DATABASE_URL` di `.env` mengarah ke **Neon cloud** (`ep-bold-flower-...neon.tech`), bukan database lokal.

Konsekuensi:

- **Jangan** menjalankan seed/debug seed ke database ini.
- Untuk eksperimen dan "sengaja merusak kode", pakai salah satu:
  1. **Neon branch** (disarankan): buat branch database di dashboard Neon, lalu isi `DATABASE_URL` branch tersebut ke `.env.debug`.
  2. **PostgreSQL lokal** (Docker/instalasi) dengan `DATABASE_URL=postgresql://...@localhost:5432/pos_debug`.
- `prisma/seed-debug.ts` sudah punya pengaman: menolak jalan ke host non-lokal kecuali `SEED_DEBUG_ALLOW_REMOTE=1`.

## 6. Yang belum ada (jangan pura-pura ada)

- Test otomatis (unit/integration/e2e).
- CI (GitHub Actions).
- Error monitoring (Sentry atau sejenis).
- Structured logging.
- `README` yang menjelaskan arsitektur (masih README bawaan `create-next-app`).

Item-item ini masuk rencana minggu 3–6, bukan sekarang.

## 7. Temuan awal integritas stok (20 November 2026)

Dijalankan dengan `npm run db:check-stock` (read-only).

Hasil: **9 produk diperiksa, 6 tidak sinkron** antara `Product.stock` dan `SUM(ProductStock.quantity)`.

| Produk | `Product.stock` | Total lokasi |
|---|---:|---:|
| #13 Kopi jawa | 2 | 4 |
| #15 imam | 2 | 12 |
| #16 Ani | 5 | 113 |
| #19 ada | 2 | 8 |
| #22 Tier 4 (SKU > 5.000) | 1.000.000 | 0 |
| #23 Magnum Filter | 10 | 0 |

Catatan:

- Produk #22 dan #23 punya stok di `Product.stock` tetapi **belum punya baris** `ProductStock` (kondisi produk legacy; akan di-seed saat pertama kali dimutasi).
- Produk #13, #15, #16, #19 punya total lokasi **lebih besar** dari `Product.stock`, kemungkinan `recalculateProductStock` tidak terpanggil setelah penambahan stok (penerimaan/purchase).
- **Jangan diperbaiki dulu.** Ini bahan investigasi minggu 2: pahami dulu alur mana yang membuat nilai itu menyimpang.
- POS membaca `ProductStock`, jadi penjualan tetap berjalan; yang berpotensi salah adalah tampilan total stok/laporan.

---

## 8. Perubahan setelah baseline (23 November 2026)

Snapshot §1 tetap dipakai sebagai pembanding. Kondisi repo sekarang:

| Item | Nilai | Catatan |
|---|---|---|
| HEAD `main` | `154be90` | 4 commit setelah baseline |
| Commit baru | `10d8334`, `4d17ead`, `f44acd1`, `154be90` | dokumentasi belajar + tool `db:check-stock` |
| Working tree | **kotor**: 6 file, 489 baris | perubahan auth/user management, belum di-commit sejak 17 Nov |
| `docs/auth-google-audit.md` | untracked | hasil audit login Google |
| Test otomatis | 0 file | belum berubah |
| Route API | 41 | belum berubah |

Aturan yang tetap berlaku:

- `npm run check` tetap harus lolos sebelum dan sesudah task.
- Angka di tabel ini **bukan** baseline baru. Kalau butuh baseline baru, catat
  commit yang bersih (tanpa perubahan yang menggantung) dan buat file terpisah.

### 8.1 Fitur Produk Bundle (23 November 2026)

| Item | Nilai | Catatan |
|---|---|---|
| Model Prisma baru | `Bom`, `BomComponent` | tabel `bom`, `bom_component` |
| Kolom baru | `invoice_items.components` (JSONB) | snapshot komposisi untuk restore stok |
| Migrasi | `20261123090000_add_product_bom` | sudah diterapkan ke Neon (23 Nov 2026) |
| Route API | 41 (tidak berubah) | BOM dikelola lewat `/api/products[/[id]]` |
| Dokumentasi | `docs/flows/product-bundle.md` | alur lengkap + invariant |

Aturan baru yang wajib dipertahankan:

- Produk bundle **tidak punya stok sendiri**: `Product.stock` = 0 dan tanpa baris `ProductStock`.
- Stok bundle dihitung dari komponen saat dibaca (`lib/bom.ts` -> `computeBundleStock`).
- Penjualan (POS & faktur) mencatat SKU bundle tetapi memotong stok **komponen**.
- Penyesuaian stok dan penerimaan barang **menolak** produk bundle.
- `npm run db:check-stock` juga memeriksa bundle (stok 0, tanpa baris lokasi).
