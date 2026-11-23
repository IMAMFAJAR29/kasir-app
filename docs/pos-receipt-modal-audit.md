# Audit: Modal Struk Tidak Bisa Ditutup di Vercel

Tanggal: 23 November 2026
Status: **diperbaiki** (belum di-push)

## Ringkasan

Dua keluhan, dua penyebab berbeda:

| Keluhan | Penyebab | Status |
|---|---|---|
| Uang kembalian masih muncul setelah modal ditutup | State `payment`/`change` di `PaymentSection` tidak di-reset saat keranjang jadi kosong | Diperbaiki |
| Di Vercel tombol X / "Transaksi Baru" masih tidak bisa diklik | Service worker menyajikan bundle JS **lama** dari cache | Diperbaiki |

## 1. Bug kembalian tidak reset

### Akar masalah

`components/pos/PaymentSection.tsx` menyimpan `payment` dan `change` sebagai
state lokal. Efek yang menghitung kembalian hanya bereaksi pada
`[payment, total, selected]`:

```ts
useEffect(() => {
  if (selected === "cash") {
    setChange(payment - total > 0 ? payment - total : 0);
  } else {
    setPayment(0);
    setChange(0);
  }
}, [payment, total, selected]);
```

Saat `handleCloseReceipt()` dipanggil, `app/pos/page.tsx` melakukan
`setCart([])` sehingga `total` menjadi `0`. Efek di atas **memang** terpicu
(`total` berubah), tetapi bercabang ke `selected === "cash"` sehingga yang
dihitung hanya `change`. `payment` (mis. 200.000) **tidak pernah** di-reset.

Akibatnya setelah modal ditutup: input "Uang Diterima" masih berisi
200.000, dan karena `change = payment - total = 200.000`, panel
**"Kembalian Rp 200.000"** tetap tampil untuk keranjang kosong.

### Perbaikan

Cabang eksplisit untuk keranjang kosong, sebelum logika normal:

```ts
if (total <= 0) {
  setPayment(0);
  setChange(0);
  return;
}
```

### Verifikasi (Chrome headless)

Setelah menutup modal, dengan keranjang dikosongkan:

```
STEP3 paymentInput: ""            (kosong, sebelumnya 200000)
STEP3 bodyHasKembalian: false     (sebelumnya true)
STEP3 bodyText: ... Total Tagihan ... Rp 0 ...
```

## 2. Di Vercel tombol masih tidak bisa diklik

### Yang sudah terbukti BUKAN penyebabnya

Saya periksa dulu dugaan yang paling mudah, dan semuanya bersih:

| Dugaan | Hasil pemeriksaan |
|---|---|
| Deploy Vercel belum berisi commit perbaikan | **Salah** — CSS production memuat `.max-h-\[calc\(100dvh-2rem\)\]`, kelas yang hanya ada di commit `406529e` |
| Region function salah | **Salah** — response header production: `X-Vercel-Id: sin1::…` |
| CSS production tidak memuat aturan pendukung | **Salah** — `.my-auto`, `.min-h-0`, `.shrink-0`, `.flex-1`, `.overflow-y-auto` semuanya ada |
| Logika `onClose` rusak | **Salah** — dirunut dari `ReceiptModal` → `PosSalesWorkspace` → `handleCloseReceipt`, semuanya benar |

### Akar masalah

`public/sw.js` — service worker PWA yang didaftarkan di `app/pos/page.tsx`:

```js
const CACHE_NAME = "anima-pos-v2";
```

Handler `fetch` menyajikan aset `/_next/static/*` dengan strategi
**cache-first**:

```js
if (url.pathname.startsWith("/_next/static/")) {
  const cached = await cache.match(request);
  if (cached) return cached;   // <- bundle lama dipakai terus
  ...
}
```

Karena `CACHE_NAME` **tidak pernah dinaikkan** saat memperbaiki modal,
setiap perangkat yang pernah membuka `/pos` akan terus memakai chunk JS
lama yang berisi `ReceiptModal` versi rusak (tanpa `overflow-y-auto`).
Ini persis gejalanya: **lokal bisa** (browser dev tidak memakai service
worker — di `app/pos/page.tsx` service worker hanya didaftarkan di
non-development), **Vercel tidak bisa** (production mendaftarkan `sw.js`).

Jadi build di server sudah benar; yang menyajikan kode lama adalah browser
pengguna.

### Perbaikan

1. `public/sw.js`: `CACHE_NAME` dinaikkan `anima-pos-v2` → **`anima-pos-v3`**.
   Handler `activate` sudah menghapus cache lama yang namanya tidak cocok:
   ```js
   cacheName.startsWith("anima-pos-") && cacheName !== CACHE_NAME
   ```
   sehingga bundle lama dibuang dan aset diambil ulang dari network.

2. `components/pos/ReceiptModal.tsx` + `app/globals.css`: batas tinggi
   tidak lagi bergantung pada dukungan `dvh`. Kelas `.receipt-sheet` memakai
   dua deklarasi berurutan:
   ```css
   .receipt-sheet {
     max-height: calc(100vh - 2rem);
     max-height: calc(100dvh - 2rem);  /* diabaikan browser lama */
   }
   ```
   Fallback `vh` menjaga perilaku tetap benar di browser yang tidak mengenal
   `dvh`.

### Mengapa ini tetap perlu meski build sudah benar

Tanpa menaikkan `CACHE_NAME`, setiap perbaikan CSS/JS ke depan akan
**tertahan di perangkat kasir** sampai cache dibersihkan manual. Ini bukan
sekadar soal satu bug ini — seluruh proses deploy jadi tidak deterministik.

## Verifikasi

Diuji dengan Chrome headless (CDP), pada **build production** (`next start`),
bukan dev server — karena hanya mode production yang mendaftarkan `sw.js`.

| Viewport | Tombol terlihat | Klik menutup | Kembalian reset |
|---|---|---|---|
| 390×640 | ya | ya | ya |
| 740×380 (landscape) | ya | ya | ya |

Bukti simulasi untuk browser tanpa dukungan `dvh`:

```
NORMAL  : closeTop=561 closeBottom=607 vp=640  inView=true
TANPA dvh (max-height diabaikan): inView=false, TAPI overlay bisa
          di-scroll -> reachable=true
```

Artinya bahkan pada browser paling lama pun tombol tetap dapat dijangkau.

Pemeriksaan kualitas: `npx tsc --noEmit` 0 error, `npm run build` exit 0
(51 halaman), lint 6 warning (sama dengan baseline).

## Langkah setelah deploy

Kenaikan `CACHE_NAME` baru berlaku setelah service worker versi baru
terpasang. `sw.js` sendiri tidak di-cache (`Cache-Control: max-age=0,
must-revalidate`), dan `install` memanggil `self.skipWaiting()` serta
`activate` memanggil `self.clients.claim()`, jadi perangkat akan pindah
versi pada reload berikutnya.

Kalau perangkat kasir masih memakai bundle lama setelah deploy:

1. Tutup semua tab aplikasi.
2. Buka lagi, tunggu reload otomatis (kode di `page.tsx` melakukan reload
   sekali bila worker baru mengambil alih).
3. Bila masih, DevTools → Application → Service Workers → **Update**, lalu
   **Clear storage**.

## Sisa risiko yang belum ditangani

1. **Strategi cache-first untuk `_next/static` tetap rentan.** Nama file
   chunk Next.js sudah ber-hash, jadi sebenarnya aman di-cache permanen —
   yang berbahaya adalah `APP_ROUTE` (`/pos`) yang di-cache dan bisa
   menyajikan HTML lama yang menunjuk chunk lama. Handler navigate sudah
   network-first (baik), tapi `install` menyalin `/pos` ke cache.
2. **`CACHE_NAME` harus dinaikkan manual setiap kali ada perubahan penting.**
   Lebih baik digenerate saat build agar tidak bisa terlupa.
3. **Belum ada test otomatis** — kedua regresi ini lolos karena tidak ada
   test UI.
