# Deployment Vercel

## Pengaturan yang direkomendasikan

- **Root Directory:** `web`
- **Framework:** Next.js
- **Node.js:** 22.x (minimal 22.18 untuk menjalankan pemeriksaan TypeScript native)
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

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
