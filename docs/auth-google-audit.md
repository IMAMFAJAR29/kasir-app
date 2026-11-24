# Audit Login Google — Akses Ditolak

Tanggal: 2026-11-17
Status: **belum di-commit** (diverifikasi ulang 23 November 2026)

> Perubahan ada di working tree: `lib/authOptions.ts`, `lib/userOwnership.ts`,
> `app/api/users/route.ts`, `app/api/users/[id]/route.ts`, `app/auth/page.tsx`.
> Risiko: akun yang dipakai sehari-hari bukan pemilik utama (user pertama) dan
> belum punya NIK/PIN. Jangan deploy sebelum langkah manual di bawah selesai.

## Gejala

Login memakai tombol **Lanjutkan dengan Google** gagal dan pengguna kembali ke
halaman `/auth` tanpa penjelasan (terasa seperti "access denied").

## Akar Masalah

### 1. Aturan Google login hanya untuk "pemilik utama", tetapi pemilik utama di
database bukan akun yang dipakai

`getMasterOwner()` (`lib/userOwnership.ts`) menentukan pemilik utama sebagai
**user pertama yang dibuat** (`orderBy createdAt asc`) dan belum dihapus.

Data saat audit (email disamarkan):

| Nama | Email | Role | Dibuat | NIK/PIN |
| --- | --- | --- | --- | --- |
| rrukini | `6***@gmail.com` | ADMIN | 2025-09-23 | tidak ada |
| Imam Fajar | `i***@gmail.com` | ADMIN | 2026-10-08 | tidak ada |

Perubahan lokal di `lib/authOptions.ts` membatasi login Google **hanya** untuk
email pemilik utama. Akibatnya akun `i***@gmail.com` (ADMIN aktif) ditolak
dengan kode `GoogleMasterOnly`, padahal sebelumnya (versi ter-commit) semua
ADMIN aktif boleh masuk lewat Google.

Akun tersebut juga tidak memiliki NIK/PIN, sehingga tidak punya jalur login
alternatif. Ini berisiko lockout total.

### 2. Halaman `/auth` mengabaikan parameter `?error=`

Callback `signIn` sudah mengembalikan kode error yang spesifik
(`GoogleMasterOnly`, `AccountInactive`, `AccountDeleted`, dll.), tetapi
`app/auth/page.tsx` tidak pernah membaca parameter tersebut. Alasan penolakan
jadi tidak terlihat oleh pengguna.

### 3. Lingkungan lokal bisa mengarah ke domain produksi

`.env` berisi `NEXTAUTH_URL=https://kasir-app-hazel.vercel.app`, sedangkan
`.env.local` berisi `http://localhost:3000`. Next.js memprioritaskan
`.env.local`, tetapi **environment variable proses** (misalnya dari terminal
atau Vercel CLI) menang atas file `.env*`.

Saat dev server dijalankan dengan `NEXTAUTH_URL` produksi, URL otorisasi Google
memakai callback produksi
(`https://kasir-app-hazel.vercel.app/api/auth/callback/google`) sementara cookie
state diset di localhost. Ini membuat proses OAuth gagal.

### 4. Checklist konfigurasi Google Cloud (di luar kode)

Jika pesan yang muncul adalah halaman Google **"Access blocked / Error 403:
access_denied"**, penyebabnya ada di Google Cloud Console, bukan di aplikasi:

- OAuth consent screen masih berstatus **Testing** dan akun Google yang dipakai
  belum ditambahkan sebagai **Test user**.
- **Authorized redirect URIs** belum memuat:
  - `https://kasir-app-hazel.vercel.app/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google` (untuk dev lokal)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` di Vercel berbeda dengan client
  yang dipakai lokal.

## Perbaikan yang Diterapkan

1. `lib/authOptions.ts`
   - Google login diizinkan untuk pemilik utama **atau** akun ADMIN yang sudah
     terdaftar dan aktif.
   - Akun nonaktif → `AccountInactive`; akun terhapus → `AccountDeleted`;
     akun non-admin → `GoogleMasterOnly` (diarahkan memakai NIK & PIN).
2. `app/auth/page.tsx`
   - Membaca `?error=` dari NextAuth dan menampilkan pesan dalam Bahasa
     Indonesia, lalu membersihkan parameter dari URL.

## Verifikasi

- `npx tsc --noEmit` — lolos.
- `npx next lint --file lib/authOptions.ts --file app/auth/page.tsx` — lolos.
- Dev server: `/auth` dan `/auth?error=GoogleMasterOnly` merespons 200.
- `/api/auth/providers` mengembalikan callback sesuai origin yang dipakai.

## Tindakan Manual yang Masih Diperlukan

1. Pastikan akun Google yang dipakai memang terdaftar sebagai ADMIN aktif di
   database.
2. Di Google Cloud Console, tambahkan akun tersebut sebagai test user (jika
   consent screen masih Testing) dan lengkapi authorized redirect URI untuk
   domain produksi maupun localhost.
3. Saat menjalankan dev server, pastikan tidak ada environment variable
   `NEXTAUTH_URL` produksi yang menimpa `.env.local`.

## Catatan Tambahan (Prioritas Rendah)

- `app/api/auth/[...nextauth]/route.tsx` dan `app/api/auth/login/route.tsx`
  memakai ekstensi `.tsx`; saat ini masih dikenali Next.js, tetapi konvensi
  resmi route handler adalah `.ts`.
- `app/api/auth/login/route.tsx` menduplikasi logika kredensial yang sudah ada
  di `authOptions`; saat ini tidak dipakai oleh halaman login.
