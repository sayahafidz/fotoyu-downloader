# Deployment Vercel

## Pengaturan yang direkomendasikan

- **Root Directory:** `web`
- **Framework:** Next.js
- **Node.js:** 22.x (minimal 22.18 untuk menjalankan pemeriksaan TypeScript native)
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Function Region:** Singapore (`sin1`), ditentukan di kedua file `vercel.json`.

`web/vercel.json` menyediakan pengaturan ini. Jika Root Directory tetap di root repository, `vercel.json` di root menggunakan `npm ci --prefix web` dan output `web/.next`. Pilih satu Root Directory dan biarkan konfigurasi terkait digunakan.

## Environment variables

Preview, parser lokal, download, ZIP, collage, dan auto-enhance tidak memerlukan API key. Untuk pemrosesan gambar provider, tambahkan variabel server sesuai provider:

- `DEWATERMARK_API_KEY` untuk Dewatermark.
- `GEMINI_API_KEY` untuk Gemini.
- `GEMINI_BASE_URL` jika memakai endpoint image-capable custom. Endpoint harus HTTPS. Bila memakai key milik server dengan endpoint custom, atur keduanya di Vercel.
- `GEMINI_MODEL` untuk model endpoint OpenAI-compatible. Default: `hfz/gemini-3.1-flash-image`, sudah diuji melalui 9Router. Payload harus tetap berisi pesan instruksi dan input foto, bukan `messages: []`.

Jangan gunakan prefix `NEXT_PUBLIC_` untuk secret. Pastikan variabel tersedia di environment Production dan Preview yang diperlukan, lalu redeploy. Model/endpoint provider harus benar-benar mendukung output gambar; endpoint chat teks tidak dapat menggantikan image editing.

## Pemeriksaan sebelum push

Jalankan dari root repository:

```sh
npm run check
```

Ini menjalankan TypeScript, pengujian parser/allowlist, dan build produksi. ZIP dibuat di browser, bukan filesystem function. Proxy mengalirkan respons foto; pemrosesan provider dibatasi 20 MB per input dan durasi function 60 detik. Aktifkan Fluid Compute untuk konfigurasi serverless Vercel terkini.

## Smoke check setelah deploy

1. Paste JSON keranjang, buka thumbnail, preview besar, zoom, dan pindah foto.
2. Uji download satu foto, download langsung beberapa foto, serta ZIP.
3. Filter fotografer dan pastikan download hanya mengambil foto pada filter atau pilihan aktif.
4. Uji collage dan auto-enhance di HP.
5. Uji provider yang sudah dikonfigurasi, lalu coba URL tidak valid dan token kedaluwarsa untuk memastikan error terbaca.
6. Refresh PWA setelah redeploy. Service worker memakai network-first untuk halaman dan tidak menyimpan API atau chunk Next.js.

Browser dapat meminta izin download beberapa file. Jika browser memblokir download beruntun, gunakan ZIP. URL CDN dapat kedaluwarsa dan provider dapat membatasi request; ambil ulang data Fotoyu atau coba lagi sesuai pesan error. Keberhasilan click download berarti file dikirim ke browser, bukan bukti file sudah masuk galeri.

## CDN 403 hanya di production

URL yang bekerja dari komputer lokal belum tentu diizinkan dari IP datacenter Vercel. Dalam pemeriksaan, URL aktif menghasilkan HTTP 200 dari lokal tetapi HTTP 403 dari deployment dengan execution region `iad1`. Konfigurasi region `sin1` mendekatkan function ke jalur CDN Asia; ini perlu redeploy dan pengujian ulang, bukan jaminan akses jika CDN menolak IP datacenter.

Di Vercel Logs, cari `[proxy] CDN request rejected`. Log mencatat region, status, header CDN dan indikasi challenge tanpa mencatat URL foto lengkap. Header `x-vercel-id` dapat membantu melihat region request/function (misalnya `sin1::iad1` menunjukkan request masuk Singapore namun function berjalan di iad1).

Jika 403 tetap terjadi di `sin1`, pastikan URL masih bekerja ketika dibuka langsung dan tanyakan akses server/CDN yang didukung kepada penyedia. Thumbnail dan preview memiliki fallback langsung, tetapi download ZIP, canvas enhance, dan pemrosesan Gemini masih memerlukan byte foto yang dapat diakses. Tampilan gambar lintas origin bisa berhasil sementara fetch/canvas gagal karena CORS. Jangan mengubah signature URL foto atau menganggap pergantian header selalu memperbaiki akses.
