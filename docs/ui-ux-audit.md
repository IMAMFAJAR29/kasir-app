# UI/UX Audit Report — Anima POS

**Tanggal audit:** 29 Oktober 2026  
**Auditor:** Senior UI/UX Designer & Design Systems Engineer (static code audit)  
**Scope:** Seluruh halaman, komponen, layout, global CSS, dan design tokens yang ada di repository.

> **Catatan metodologi:** Audit ini dilakukan secara statis (membaca source code, konfigurasi, dan struktur komponen). Akses browser langsung / screenshot tidak tersedia pada sesi ini, sehingga temuan yang memerlukan verifikasi visual (kontras aktual, rendering perangkat, animasi) ditandai sebagai *“perlu verifikasi visual”*. Tidak ada perubahan kode yang dilakukan pada tahap ini.

---

## 1. Executive Summary

Aplikasi Anima POS adalah dashboard operasional (kasir, inventaris, pembelian, faktur, akuntansi) berbasis Next.js 15 + Tailwind CSS v4. Secara fungsional lengkap, namun secara visual/design system **belum matang dan tidak konsisten**:

- **Design system yang ada tidak dipakai.** Folder `components/ui/` menyediakan `Button`, `Card`, `Badge`, `Table`, `Skeleton`, tetapi hampir tidak digunakan (Button ui dipakai 1 file, Card 1 file, Table 0 file, Badge 0 file). Setiap halaman membangun markup-nya sendiri.
- **Dua implementasi Button** (`components/Button.tsx` default export dan `components/ui/button.tsx` named export) dengan API dan variant berbeda → inkonsistensi.
- **Tipografi tidak terstandardisasi.** Ukuran font tersebar (`text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`...) dengan hierarki heading yang tidak konsisten antar halaman.
- **Warna aksen ganda**: brand biru (`#1769e0`) vs indigo (`indigo-600`) vs slate-900 digunakan bergantian untuk aksi utama; gradient/glow minimal (baik), tetapi inkonsistensi warna aksen mengurangi identitas visual.
- **Spacing, radius, dan shadow** bervariasi liar (`rounded-lg/xl/2xl/3xl/full`, `shadow`/`shadow-sm`/`shadow-md`/`shadow-xs`).
- **Accessibility dasar lemah**: hanya 25 `focus-visible` di seluruh codebase, `dark:` tidak ada (tidak masalah jika tidak diminta), kontras beberapa teks kecil (text-[10px]) perlu verifikasi.
- **Responsif**: sebagian besar halaman memakai `sm:`/`lg:`/`xl:` breakpoints, namun beberapa komponen (tabel lebar tetap `min-w-[620px]`) berisiko overflow di mobile.

Secara keseluruhan, aplikasi **fungsional dan cukup rapi**, tetapi terasa seperti kumpulan komponen yang dibangun per-halaman tanpa design system terpusat. Tidak terlihat seperti "AI slop" (gradient berlebihan/glow) — justru sebaliknya, terlalu banyak variasi kecil yang tidak terkoordinasi.

---

## 2. Inventarisasi Halaman & Layout

### 2.1 Route (25 halaman)

| Route | File | Keterangan |
|---|---|---|
| `/` | `app/page.tsx` | Landing/redirect berbasis role |
| `/auth` | `app/auth/page.tsx` | Login admin (email+password) & kasir (NIK+PIN), Google |
| `/pos` | `app/pos/page.tsx` | Kasir POS (offline-capable) |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Dashboard ringkasan bisnis |
| `/admin/products` | `app/admin/products/page.tsx` | Katalog produk |
| `/admin/categories` | `app/admin/categories/page.tsx` | Kategori (tree) |
| `/admin/users` | `app/admin/users/page.tsx` | Manajemen pengguna |
| `/admin/settings` | `app/admin/settings/page.tsx` | Pengaturan sistem |
| `/admin/settings/accounts` | `app/admin/settings/accounts/page.tsx` | Akun |
| `/admin/settings/reconciliation` | `app/admin/settings/reconciliation/page.tsx` | Rekonsiliasi kas |
| `/admin/cash-sessions` | `app/admin/cash-sessions/page.tsx` | Sesi kas |
| `/admin/accounting/accounts` | `app/admin/accounting/accounts/page.tsx` | COA |
| `/admin/accounting/journals` | `app/admin/accounting/journals/page.tsx` | Jurnal umum |
| `/admin/accounting/ledger` | `app/admin/accounting/ledger/page.tsx` | Buku besar |
| `/admin/accounting/reports` | `app/admin/accounting/reports/page.tsx` | Laporan keuangan |
| `/invoices` | `app/invoices/page.tsx` | Faktur penjualan |
| `/invoices/print/[id]` | `app/invoices/print/[id]/page.tsx` | Cetak faktur |
| `/purchases` | `app/purchases/page.tsx` | Pembelian |
| `/purchases/print/[id]` | `app/purchases/print/[id]/page.tsx` | Cetak pembelian |
| `/purchases/receiving` | `app/purchases/receiving/page.tsx` | Penerimaan barang |
| `/purchases/receiving/[id]` | `app/purchases/receiving/[id]/page.tsx` | Detail penerimaan |
| `/purchases/receiving/[id]/print` | ... | Cetak penerimaan |
| `/sales/customers` | `app/sales/customers/page.tsx` | Kontak pelanggan |
| `/warehouse/locations` | `app/warehouse/locations/page.tsx` | Lokasi gudang |
| `/warehouse/stock` | `app/warehouse/stock/page.tsx` | Stok gudang |

### 2.2 Layout global
- `app/layout.tsx` — root layout, font `Plus_Jakarta_Sans` (next/font/google), `AppShell`.
- `components/AppShell.tsx` — menyembunyikan Navbar di `/auth`, `/pos`; memberi `pt-16` jika navbar tampil.
- `components/Navbar.tsx` — fixed top navbar, h-16, backdrop blur, dropdown menu, mobile hamburger. Menggunakan `lucide-react` icons.

### 2.3 Komponen shared
- `components/ui/`: `badge.tsx`, `button.tsx`, `card.tsx`, `skeleton.tsx`, `table.tsx` — **hampir tidak digunakan**.
- `components/Button.tsx` (default export) — dipakai 13 file.
- `components/Modal.tsx`, `components/Navbar.tsx`, `components/AppShell.tsx`.

---

## 3. Temuan Audit per Kategori

### 3.1 P0 — Kritis (mengganggu fungsi / tidak dapat digunakan)

| # | Halaman/Komponen | Bukti (kode) | Masalah | Dampak | Rekomendasi |
|---|---|---|---|---|---|
| P0-1 | Semua halaman dengan tabel lebar | `min-w-[620px]` (categories), tabel produk/invoices/purchases | Tabel dengan min-width tetap dapat overflow horizontal di mobile tanpa indikator scroll | Data terpotong, sulit dibaca di HP | Tambah `overflow-x-auto` wrapper + sticky first column; atau card view di mobile |
| P0-2 | `components/pos/ProductList.tsx` | `grid grid-cols-2 ... sm:grid-cols-3 xl:grid-cols-4` | Grid produk OK, tetapi empty state & scan modal perlu verifikasi kontras | — | Verifikasi visual |
| P0-3 | `app/pos/page.tsx` | `text-base tracking-[0.2em]` pada input PIN | Tracking sangat lebar untuk PIN pendek — bisa terlihat aneh | UX input PIN | Gunakan `tracking-widest` atau `tracking-[0.3em]` konsisten |

### 3.2 P1 — Inkonsistensi visual signifikan / usability

| # | Halaman/Komponen | Bukti (kode) | Masalah | Dampak | Rekomendasi |
|---|---|---|---|---|---|
| P1-1 | Seluruh app | `components/ui/button.tsx` dipakai 1 file; `components/Button.tsx` dipakai 13 file | Dua sistem Button dengan API berbeda (variant/size) | Tampilan tombol tidak konsisten; maintenance ganda | Pilih satu (disarankan `components/Button.tsx` yang sudah dominan) dan hapus/deprecate yang lain; atau migrasi ke `ui/button` |
| P1-2 | Seluruh app | `components/ui/table.tsx` dipakai 0 file; 21 raw `<table>` | Tabel dibangun manual per halaman → inkonsistensi padding/border/header | Tabel berbeda-beda antar halaman | Adopsi `ui/table` atau buat wrapper standar; refactor bertahap |
| P1-3 | Seluruh app | `components/ui/card.tsx` dipakai 1 file; `modern-card` class 0 penggunaan | Card dibangun manual (border/shadow/padding berbeda) | Inkonsistensi kartu | Standarkan card dengan komponen shared |
| P1-4 | Seluruh app | `components/ui/badge.tsx` dipakai 0 file | Badge status dibangun manual (rounded-full + warna ad-hoc) | Status badge tidak seragam | Adopsi `ui/badge` |
| P1-5 | `app/admin/dashboard/page.tsx` | `<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">` | Judul halaman ukuran berbeda dari halaman lain (`text-2xl` saja) | Hierarki visual tidak konsisten | Standarkan page title: `text-2xl font-bold tracking-tight text-slate-900` (tanpa sm:text-3xl) atau buat komponen `PageHeader` |
| P1-6 | `app/admin/products/page.tsx` | `<h1 className="text-2xl font-bold text-slate-900 tracking-tight">` | OK, tapi tidak ada deskripsi konsisten | — | Buat komponen `PageHeader` dengan title + description |
| P1-7 | Seluruh app | Warna aksen campur: `indigo-600`, `blue-600`, `slate-900` untuk aksi utama | Identitas visual ganda (biru vs indigo) | Tidak ada brand color tunggal | Standarkan: primary = `blue-600` (sesuai token `--brand-blue`), indigo hanya untuk aksen sekunder |
| P1-8 | `app/warehouse/stock/page.tsx` | Tab filter `bg-slate-900` (sudah diubah ke blue pada commit sebelumnya) — audit: masih ada `bg-slate-900` di kategori pill ProductList | Inkonsistensi warna tab aktif (slate vs blue) | — | Ganti semua tab aktif ke `bg-blue-600` |
| P1-9 | `app/admin/products/page.tsx`, `ProductList.tsx` | Tabel min-width `min-w-[620px]` tanpa wrapper scroll di beberapa tempat | Overflow horizontal | Usability mobile | Wrap dengan `overflow-x-auto` |
| P1-10 | Semua form | 94 `<input>` raw vs 49 `.form-control` | Input styling tidak konsisten (border, radius, focus) | Form terlihat berbeda antar halaman | Standarkan semua input ke `.form-control` atau komponen shared `Input` |
| P1-11 | `components/Navbar.tsx` | Dropdown menu hanya `group-hover:block` (CSS hover) — tidak ada keyboard/aria | Tidak bisa diakses via keyboard, tidak ada `aria-expanded` | Accessibility | Tambah state-based open + keyboard (Enter/Escape) + aria attributes |

### 3.3 P2 — Kualitas visual, tipografi, spacing, detail

| # | Halaman/Komponen | Bukti (kode) | Masalah | Rekomendasi |
|---|---|---|---|---|
| P2-1 | Seluruh app | `text-[10px]` (26x), `text-[11px]` (29x) selain `text-xs` | Ukuran mikro tidak standar, sulit dibaca | Gunakan `text-xs` (12px) sebagai minimum; hapus arbitrary 10/11px |
| P2-2 | Seluruh app | `font-medium` (127x), `font-semibold` (238x), `font-bold` (130x) | Terlalu banyak variasi weight tanpa aturan | Definisikan: body `font-normal`, label `font-medium`, heading `font-semibold`/`font-bold` |
| P2-3 | Seluruh app | `rounded` (448x generik), `rounded-lg/xl/2xl/3xl/full` campur | Radius tidak konsisten (8/12/16/24px) | Standar: control `rounded-lg` (8px), card `rounded-xl` (12px), modal `rounded-2xl` (16px), pill `rounded-full` |
| P2-4 | Seluruh app | `shadow` (174x), `shadow-sm` (64x), `shadow-xs` (59x), `shadow-md` (15x) | Shadow campur, beberapa `shadow-xs` (Tailwind v4 custom) | Standar: card `shadow-sm`, modal `shadow-lg`, hover `shadow-md` |
| P2-5 | `app/admin/products/page.tsx` | Tabel min-width tanpa scroll wrapper di beberapa tempat | Overflow | `overflow-x-auto` + sticky column |
| P2-6 | `components/pos/ProductList.tsx` | `text-[10px] uppercase font-mono` untuk SKU | SKU terlalu kecil | `text-xs font-mono` |
| P2-7 | `app/admin/dashboard/page.tsx` | Gradient? 3 penggunaan `gradient` di seluruh app (sedikit) | OK, minimal | — |
| P2-8 | `app/globals.css` | `body { font-family: "Plus Jakarta Sans", sans-serif; }` hardcoded, tapi layout pakai `plusJakartaSans.className` | Redundan; jika font gagal load, fallback sans-serif generik | Hapus hardcoded font-family di globals.css, andalkan next/font class; tambah fallback `system-ui` |
| P2-9 | `components/BrandLoader.tsx`, `components/Modal.tsx` | Perlu cek styling loading/modal | Perlu verifikasi visual |
| P2-10 | `app/admin/categories/page.tsx` | Indentasi sub-kategori (sudah dihapus pada commit terakhir) | OK setelah perbaikan |
| P2-11 | Semua halaman | Inline `style={{}}` hanya 2 penggunaan (indentasi kategori, sekarang dihapus) | Baik — styling via Tailwind konsisten | — |
| P2-12 | `components/pos/PosAccountBar.tsx` | Pill badge dengan `min-w-[84px]` (baru ditambahkan) | Perlu verifikasi apakah terlalu lebar di mobile | Verifikasi visual |
| P2-13 | `app/auth/page.tsx` | Form login admin & kasir dalam satu halaman dengan toggle | Perlu verifikasi alur & konsistensi | Verifikasi visual |

### 3.4 P3 — Polish kosmetik

| # | Halaman/Komponen | Masalah | Rekomendasi |
|---|---|---|---|
| P3-1 | Semua | Tidak ada dark mode (`dark:` 0) | Opsional; jika tidak diminta, abaikan |
| P3-2 | `components/Navbar.tsx` | Logo file `/Logo.png.png` (double extension) | Rename file & update path |
| P3-3 | Semua | `focus-visible` hanya 25 penggunaan → banyak elemen interaktif tanpa focus ring terlihat | Tambahkan focus ring global di globals.css (`:focus-visible { outline: 2px solid var(--brand-blue); }`) |
| P3-4 | Semua | `aria-` hanya 34 penggunaan → accessibility dasar lemah | Audit & tambah aria-label/role/aria-expanded |
| P3-5 | `components/ui/skeleton.tsx` | Perlu cek apakah dipakai | Verifikasi |
| P3-6 | Semua | Emoji (✕, dll.) campur dengan icon lucide | Standarkan icon lucide untuk semua aksi |
| P3-7 | `app/invoices/print/[id]`, `purchases/print/[id]` | Print styles | Verifikasi hasil cetak |

---

## 4. Daftar Inkonsistensi Font & Typography

### 4.1 Font family
- **Satu-satunya font:** `Plus_Jakarta_Sans` via `next/font/google` (layout.tsx) + hardcoded `"Plus Jakarta Sans", sans-serif` di globals.css. Konsisten, tetapi hardcoded string di CSS redundant dan berisiko fallback ke generic sans jika font gagal load.
- **Tidak ada font monospace dedicated** untuk SKU/barcode — pakai `font-mono` (Tailwind default = ui-monospace).

### 4.2 Skala tipografi yang digunakan (tidak terstandardisasi)
| Token | Frekuensi | Penggunaan aktual |
|---|---|---|
| `text-[10px]` | 26 | Badge, meta, caption |
| `text-[11px]` | 29 | Caption, deskripsi kecil |
| `text-xs` (12px) | 278 | Label, meta, badge |
| `text-sm` (14px) | 265 | Body, input, tabel |
| `text-base` (16px) | 26 | Body besar |
| `text-lg` (18px) | 23 | Subheading |
| `text-xl` (18? 20px) | 12 | Heading kecil |
| `text-2xl` (24px) | 41 | Page title |
| `text-3xl` (30px) | 10 | Page title (dashboard, stock) |

**Masalah:** Skala tidak konsisten; heading halaman bervariasi `text-2xl` vs `text-2xl sm:text-3xl`. Caption bervariasi 10/11/12px.

### 4.3 Font weight
- `font-normal` (3x) — hampir tidak digunakan (body default).
- `font-medium` (127x), `font-semibold` (238x), `font-bold` (130x), `font-extrabold` (1x).
- Tidak ada aturan jelas kapan pakai medium vs semibold vs bold.

### 4.4 Line-height & letter-spacing
- `tracking-tight` dipakai di beberapa heading, tidak konsisten.
- `tracking-[0.12em]` / `tracking-[0.2em]` untuk uppercase label.
- `leading-tight`, `leading-5` tersebar.
- Tidak ada skala line-height standar.

### 4.5 Rekomendasi tipografi
Buat typography scale di `globals.css` (CSS variables) atau Tailwind theme:
- `--text-caption: 0.75rem (12px)` (hapus 10/11px)
- `--text-body: 0.875rem (14px)`
- `--text-body-lg: 1rem (16px)`
- `--text-h3: 1.125rem (18px)`
- `--text-h2: 1.25rem (20px)`
- `--text-h1: 1.5rem (24px)`
- Weight: body 400, label 500, heading 600 (semibold). Hapus penggunaan `font-bold` untuk heading kecuali penekanan.
- Line-height: body 1.5, heading 1.25.

---

## 5. Daftar Komponen dengan Tampilan Tidak Konsisten

| Komponen | Implementasi | Inkonsistensi |
|---|---|---|
| **Button** | `components/Button.tsx` (default) 13 file + `components/ui/button.tsx` (named) 1 file | Dua API, variant/size berbeda |
| **Card** | `components/ui/card.tsx` 1 file; sisanya manual `rounded-2xl border bg-white shadow-sm p-...` | Padding/shadow/radius bervariasi (p-3/p-4/p-5/p-6) |
| **Table** | `components/ui/table.tsx` 0 file; 21 raw `<table>` | Header styling, padding, border berbeda |
| **Badge** | `components/ui/badge.tsx` 0 file; badge manual (rounded-full + warna) | Status badge warna & ukuran berbeda |
| **Input** | `.form-control` (49) + raw Tailwind (94) | Border, focus ring, radius berbeda |
| **Modal** | `components/Modal.tsx` + modal manual (fixed overlay + backdrop) | Radius, padding, header style berbeda |
| **Page Header** | Manual per halaman (h1 + p) | Ukuran/weight/deskripsi tidak konsisten |
| **Empty State** | Manual (icon + text) | Ikon & layout berbeda |
| **Loading** | `BrandLoader`, `skeleton.tsx` | Tidak konsisten penggunaan |

---

## 6. Elemen yang Membuat UI Terlihat Generik

1. **Tidak ada identitas visual kuat.** Warna brand (navy/blue/teal/purple) didefinisikan di `:root` tetapi jarang dipakai secara konsisten — kebanyakan pakai `slate-*` + `blue-600`/`indigo-600` ad-hoc.
2. **Banyak kartu identik** tanpa hierarki: dashboard/products/invoices/purchases memakai pola `rounded-2xl border bg-white shadow-sm p-4` yang sama, sulit dibedakan.
3. **Tabel terlalu padat / terlalu longgar** tergantung halaman; tidak ada densitas standar.
4. **Icon lucide dipakai konsisten** (baik), tetapi ukuran icon bervariasi (h-3.5, h-4, h-5) tanpa aturan.
5. **Gradient minimal** (3 penggunaan) — ini justru baik, tidak "AI slop".
6. **Backdrop-blur** 20 penggunaan (navbar, modal) — cukup, tapi perlu verifikasi performa mobile.
7. **Shadow berlapis** (`shadow-sm` + `hover:shadow-md`) di banyak card — bisa terasa "template".
8. **Layout dashboard operasional** sudah OK (tabel + filter), bukan landing page.

---

## 7. Usability & Accessibility

### 7.1 Yang sudah baik
- Navigasi utama via Navbar dengan dropdown per modul (Katalog, Penjualan, Pembelian, Gudang, Akuntansi).
- Permission-based menu (canView).
- Mobile hamburger menu.
- Loading state (BrandLoader) dan empty state di beberapa halaman.
- Form validation (required, min length) di beberapa tempat.

### 7.2 Temuan
- **Focus ring** hanya 25 `focus-visible` di seluruh codebase → banyak elemen interaktif tanpa focus indicator yang terlihat (WCAG 2.4.7).
- **aria-** hanya 34 penggunaan → dropdown, modal, tabs kurang atribut aksesibilitas (aria-expanded, aria-controls, role).
- **Kontras**: teks `text-[10px]` / `text-slate-400` pada background putih perlu verifikasi (kemungkinan di bawah 4.5:1).
- **Target sentuh**: beberapa tombol icon-only `p-2` (~32px) di bawah 44px minimum (WCAG 2.5.5). Perlu verifikasi.
- **Keyboard navigation**: dropdown navbar pakai `group-hover` (CSS) — tidak bisa dibuka dengan keyboard.
- **Modal**: perlu verifikasi focus trap & ESC close.
- **Tabel**: tidak ada `scope` pada `<th>` di beberapa tempat (beberapa sudah ada).

### 7.3 Yang perlu verifikasi visual (tidak bisa diverifikasi dari kode)
- Kontras warna aktual (perlu color checker).
- Rendering di mobile (320px–480px).
- Animasi/transition terasa smooth atau janky.
- Focus ring terlihat atau tidak.
- Print layout faktur/pembelian.

---

## 8. Audit Implementasi Frontend

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4 (`@tailwindcss/postcss`), Prisma 6, NextAuth 4.
- **Global CSS:** `app/globals.css` — import Tailwind, design tokens di `:root`, `@theme inline`, `.form-control`, `.modern-card`, `.glass-panel`, scrollbar custom, print styles.
- **Font:** `Plus_Jakarta_Sans` via `next/font/google` di `layout.tsx`; hardcoded di globals.css.
- **Tailwind config:** v4 style (no `tailwind.config.js` — config via CSS `@theme`). Design tokens di CSS.
- **Komponen shared:** `components/ui/*` (button, card, badge, table, skeleton) ada tetapi **hampir tidak digunakan** — duplikasi dengan `components/Button.tsx` dan markup manual.
- **Library UI:** Tidak ada shadcn/radix/headlessui. Hanya Tailwind + lucide-react + framer-motion + sweetalert2.
- **Icon:** lucide-react konsisten (baik).
- **Breakpoints:** `sm:` (640), `md:` (768), `lg:` (1024), `xl:` (1280). Digunakan cukup.
- **Dark mode:** Tidak ada (`dark:` 0). Jika tidak diminta, abaikan.
- **Inline styles:** 2 penggunaan (indentasi kategori — sudah dihapus). Baik.
- **CSS modules:** Tidak digunakan.

---

## 9. Rekomendasi Design System Terpadu

### 9.1 Tipografi
- Font: `Plus Jakarta Sans` (sudah ada) — pertahankan. Hapus hardcoded font-family di globals.css.
- Skala: caption 12px, body 14px, body-lg 16px, h3 18px, h2 20px, h1 24px.
- Weight: 400 (body), 500 (label), 600 (heading). Hindari 700+ kecuali penekanan.
- Line-height: body 1.5, heading 1.25.

### 9.2 Warna
- Background: `#f7f9fc` (sudah ada)
- Foreground: `#10243a` (brand-navy)
- Primary (aksi utama): `#1769e0` (brand-blue) — **satu-satunya aksen utama**. Hapus penggunaan `indigo-600` untuk tombol utama; indigo hanya aksen sekunder.
- Success: emerald-600, Warning: amber-500, Danger: rose-600, Info: sky-500.
- Border: `#e3eaf2`.
- Muted text: `#6b7280`.

### 9.3 Spacing
- Gunakan skala Tailwind: 4 (16px) sebagai unit dasar. Section gap 24px (`gap-6`), card padding 16-20px, form field gap 12-16px.

### 9.4 Border radius
- Control (button/input): `rounded-lg` (8px)
- Card: `rounded-xl` (12px)
- Modal: `rounded-2xl` (16px)
- Pill/badge: `rounded-full`

### 9.5 Shadow
- Card: `shadow-sm`
- Modal/popover: `shadow-lg`
- Hover: `shadow-md`

### 9.6 Komponen standar
- **Button**: adopsi `components/Button.tsx` (dominan) sebagai standar; deprecate `components/ui/button.tsx`.
- **Input**: standarkan ke `.form-control` atau buat komponen `Input` shared.
- **Table**: buat wrapper standar (header `bg-slate-50`, padding `px-4 py-3`, border `divide-slate-100`).
- **Card**: adopsi `components/ui/card.tsx`.
- **Badge**: adopsi `components/ui/badge.tsx`.
- **Page Header**: buat komponen `PageHeader` (title + description) untuk konsistensi.
- **Icon size**: standar 16px (`h-4 w-4`) untuk inline, 20px untuk header.

### 9.7 Responsive
- Mobile-first; tabel dengan `min-w` harus dibungkus `overflow-x-auto`.
- Breakpoint standar: mobile (<640), tablet (640-1024), desktop (>1024).

---

## 10. Prioritas Perbaikan

| Prioritas | Item | Alasan |
|---|---|---|
| **P0** | Tabel overflow di mobile (min-width tanpa scroll) | Data tidak dapat dibaca di HP |
| **P0** | Focus ring tidak terlihat (accessibility) | WCAG 2.4.7 |
| **P1** | Dua sistem Button | Inkonsistensi visual & maintenance |
| **P1** | Tabel manual (21x) tanpa standar | Inkonsistensi padding/border |
| **P1** | Input manual (94 raw) vs form-control (49) | Inkonsistensi form |
| **P1** | Page title tidak konsisten (text-2xl vs text-2xl sm:text-3xl) | Hierarki visual |
| **P1** | Warna aksen ganda (blue vs indigo) | Identitas visual |
| **P1** | Dropdown navbar tidak keyboard-accessible | Accessibility |
| **P2** | Skala font (10/11px arbitrary) | Keterbacaan |
| **P2** | Font weight tidak beraturan | Hierarki |
| **P2** | Radius & shadow campur | Konsistensi |
| **P2** | Kontras teks kecil (perlu verifikasi) | Accessibility |
| **P3** | Logo double extension | Kosmetik |
| **P3** | Emoji vs icon | Konsistensi |

---

## 11. Rencana Implementasi Bertahap

**Fase 1 (P0, 1-2 hari):**
- Tambah `overflow-x-auto` wrapper pada semua tabel.
- Tambah focus ring global di `globals.css`.

**Fase 2 (P1, 3-5 hari):**
- Pilih satu sistem Button; migrasi penggunaan.
- Buat komponen `PageHeader`, `Input`, `Table` wrapper.
- Standarkan warna aksen (blue primary).
- Perbaiki dropdown navbar (state-based + keyboard).

**Fase 3 (P2, 2-3 hari):**
- Hapus arbitrary font sizes (10/11px → text-xs).
- Standarkan font weight & radius & shadow.
- Audit kontras (color checker).

**Fase 4 (P3, 1 hari):**
- Rename logo, ganti emoji dengan icon, polish.

---

## 12. Hal yang Masih Perlu Diperiksa Secara Visual

- Kontras warna aktual (WCAG AA 4.5:1 untuk teks normal).
- Rendering di mobile (320px–480px) — overflow tabel, wrapping tombol.
- Animasi/transition (framer-motion) terasa smooth atau janky.
- Focus ring terlihat di semua browser.
- Hasil cetak faktur/pembelian (print layout).
- Modal focus trap & ESC close.
- Loading skeleton vs spinner konsistensi.
- Empty state di semua halaman (apakah ada yang tidak punya).
- Dark mode (jika diminta di masa depan — saat ini tidak ada).

---

## Kesimpulan

Aplikasi **fungsional dan cukup rapi**, tidak terlihat seperti "AI slop" (gradient/glow berlebihan). Masalah utamanya adalah **ketiadaan design system terpusat yang benar-benar digunakan**: komponen shared (`ui/*`) ada tetapi tidak diadopsi, sehingga setiap halaman membangun markup sendiri → inkonsistensi visual, tipografi, spacing, dan radius. Rekomendasi utama: adopsi design tokens + komponen shared yang sudah ada, bukan menambah library baru.

**Menunggu persetujuan sebelum mulai memperbaiki kode.** Silakan pilih fase mana yang ingin dikerjakan terlebih dahulu.