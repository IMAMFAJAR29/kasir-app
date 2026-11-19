# Baseline Kesehatan Repo

Dibuat: 19 November 2026

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
