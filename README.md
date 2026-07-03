# Fotoyu Downloader

Fast concurrent downloader untuk foto dari [fotoyu.com](https://fotoyu.com).
Tersedia dalam dua bentuk:

1. **Script Python (CLI)** — `downloader.py`, jalankan di terminal.
2. **Web app (Next.js + Vercel)** — folder `web/`, jalankan di browser, paste
   response → klik Proses → download semua foto sebagai ZIP.

Keduanya membaca JSON response dari API cart preview fotoyu, mengekstrak
semua URL foto, lalu mengunduhnya secara concurrent.

---

## Daftar Isi

- [Fitur](#fitur)
- [Dua Cara Pakai](#dua-cara-pakai)
- [Cara Mendapatkan Response dari Fotoyu](#cara-mendapatkan-response-dari-fotoyu)
- [Opsi A: Web App](#opsi-a-web-app)
  - [Menjalankan Web App Lokal](#menjalankan-web-app-lokal)
  - [Deploy ke Vercel](#deploy-ke-vercel)
- [Opsi B: Script Python (CLI)](#opsi-b-script-python-cli)
  - [Requirements](#requirements)
  - [Instalasi](#instalasi)
  - [Cara Menjalankan](#cara-menjalankan)
  - [Opsi Command Line](#opsi-command-line)
- [Struktur Output](#struktur-output)
- [Cara Kerja](#cara-kerja)
- [Exit Codes](#exit-codes)
- [Troubleshooting](#troubleshooting)

---

## Fitur

### Web App (`web/`)
- **Tanpa install** — buka di browser, paste response, klik Proses.
- **Pratinjau thumbnail** semua foto sebelum download.
- **Download per foto** atau **download semua sebagai ZIP** (dibuat di browser).
- **Proxy server-side** untuk mengatasi CORS dari `cfsimgproxy.fototree.com`.
- **Progress bar** realtime saat membuat ZIP.
- **Drag & drop** file response langsung ke halaman.

### Script Python (`downloader.py`)
- **Download concurrent** menggunakan `asyncio` + `aiohttp` (default 10 paralel).
- **Resume support** — file yang sudah ada di-skip otomatis.
- **Retry otomatis** — hingga 3 percobaan per file dengan exponential backoff.
- **Atomic write** — tulis ke file `.part` dulu lalu rename, agar tidak ada
  file korup jika download terputik di tengah jalan.
- **Penamaan file cerdas** — menggunakan field `title` (mis. `ANN_7577.JPG`),
  di-sanitize untuk Windows, dengan deduplikasi nama otomatis.
- **Progress bar** `tqdm` + **laporan ringkasan** di akhir.
- **Filter** hanya `content_type == "photo"` dan dedupe URL yang sama.

---

## Dua Cara Pakai

```mermaid
flowchart LR
    Response["Cart fotoyu"] --> A{Pilih mode}
    A -->|"Mode Token (baru)"| Token["Ambil Bearer token<br/>dari fotoyu.com"]
    A -->|"Mode Paste JSON"| Paste["Paste response JSON"]
    A -->|"Python CLI"| CLI["Script Python<br/>python downloader.py"]
    Token -->|"klik Ambil cart"| Preview["Preview grid + ZIP"]
    Paste -->|"klik Proses"| Preview
    CLI --> Result["Foto tersimpan"]
    Preview --> Result
```

- **Pilih Mode Token** (baru, paling praktis) — ambil Bearer token sekali
  dari fotoyu, lalu cart langsung ter-fetch otomatis. Token disimpan di
  browser agar tidak perlu paste ulang.
- **Pilih Mode Paste JSON** — sama seperti sebelumnya, paste response JSON
  dari DevTools.
- **Pilih Script Python** jika kamu sering download foto dan mau otomatisasi
  via terminal (lebih cepat untuk batch besar).

---

## Cara Mendapatkan Response dari Fotoyu

### Opsi A: Mode Token (rekomendasi — paling praktis)

Mode ini hanya butuh Bearer token dari fotoyu. Setelah login di fotoyu.com,
copy token dari DevTools, paste ke web app, dan cart langsung ter-fetch.

1. Buka [fotoyu.com](https://fotoyu.com) di tab baru dan **login**.
2. Pilih foto-foto di aplikasi fotoyu, tambahkan ke **keranjang (cart)**.
3. Di tab fotoyu.com, tekan `F12` → buka tab **Application**.
4. Sidebar kiri: **Storage** → **Local Storage** → **https://fotoyu.com**.
5. Cari key `access_token` atau `token`, klik kanan → **Copy** value-nya.
6. Paste token ke web app → klik **Ambil cart**.

Token biasanya berlaku beberapa jam. Jika expired, ambil token baru.

### Opsi B: Paste JSON response (cara lama, tetap tersedia)

Script Python maupun Web App (mode paste) butuh JSON response dari endpoint
cart preview fotoyu. Berikut langkah mendapatkannya:

### Langkah 1 — Pilih foto di aplikasi fotoyu

1. Buka aplikasi **fotoyu** (mis. dari `ancodebuddy/io`).
2. Pilih foto-foto yang ingin kamu download.
3. Tambahkan foto-foto tersebut ke **keranjang (cart)**.

### Langkah 2 — Buka web fotoyu dari laptop

1. Buka browser (Chrome / Edge) di laptop.
2. Aktifkan **mode tampilan HP (mobile mode)** lewat DevTools:
   - Tekan `F12` untuk membuka DevTools.
   - Klik icon **Toggle device toolbar** (Ctrl+Shift+M) untuk beralih ke
     tampilan mobile.
3. Kunjungi `https://fotoyu.com`.
4. **Login** dengan akun yang sama dengan yang kamu pakai di aplikasi.

### Langkah 3 — Buka cart dan tangkap response API

1. Dengan DevTools masih terbuka, buka **cart / keranjang** yang berisi
   foto-foto yang sudah kamu pilih.
2. Di DevTools, buka tab **Network**.
3. Filter dengan **Fetch/XHR**.
4. Cari request dengan URL:
   ```
   https://api.fotoyu.com/gs/v1/carts/preview
   ```
   > Tips: pakai kotak filter dan ketik `carts/preview` untuk mempersempit
   > pencarian. Klik request-nya untuk membuka panel detail.

### Langkah 4 — Salin response

1. Pada panel detail request, buka tab **Response** (atau **Preview**).
2. Salin seluruh isi response (berupa JSON) — klik kanan → **Copy response**,
   atau salin manual teks JSON-nya.

Setelah itu:
- **Web App (mode paste)**: paste langsung ke kotak textarea → klik Proses.
- **Script Python**: paste ke file `response-fotoyu.txt` di folder project.

Struktur response harus seperti ini (ringkas):

```json
{
  "result": {
    "data": [
      {
        "product_id": "...",
        "title": "ANN_7577.JPG",
        "url": "https://cfsimgproxy.fototree.com/.../....jpeg",
        "content_type": "photo",
        ...
      },
      ...
    ]
  },
  "message": "OK"
}
```

---

## Opsi A: Web App

Web app berada di folder `web/`. Dibangun dengan Next.js 16 + TypeScript +
Tailwind CSS, dan di-deploy ke Vercel. Tidak perlu Python.

### Menjalankan Web App Lokal

```powershell
cd web
npm install
npm run dev
```

Buka `http://localhost:3000` di browser. Lalu:

1. Paste response JSON ke kotak besar (atau drag & drop file
   `response-fotoyu.txt` ke kotak).
2. Klik tombol **Proses**.
3. Akan muncul grid thumbnail semua foto.
4. Klik **Download** di tiap foto, atau **Download semua (ZIP)** untuk
   mengunduh semua foto sekaligus sebagai satu file ZIP.

### Deploy ke Vercel

1. Push repo ini ke GitHub (sudah ada di
   `https://github.com/sayahafidz/fotoyu-downloader`).
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo
   `sayahafidz/fotoyu-downloader`.
3. Di pengaturan project:
   - **Root Directory**: ubah ke `web`
   - **Framework Preset**: Next.js (terdeteksi otomatis)
   - **Build Command**: `npm run build` (default)
   - **Install Command**: `npm install` (default)
4. Klik **Deploy**. Selesai dalam ~1 menit.

> **Catatan untuk Vercel:** CDN `cfsimgproxy.fototree.com` memblokir IP
> datacenter Vercel. Proxy preview dan ZIP download mungkin tidak berfungsi.
> Untuk fitur penuh (proxy + ZIP), deploy di server sendiri (lihat
> [Deploy dengan Docker](#deploy-dengan-docker) di bawah).

### Deploy dengan Docker (rekomendasi — semua fitur jalan)

Deploy di VPS sendiri (DigitalOcean, Vultr, Linode, dll) agar proxy jalan 100%
dan ZIP download berfungsi. VPS Indonesia biasanya tidak di-block oleh CDN fotoyu.

#### Requirements di VPS

- Docker & Docker Compose (v2)
- Domain yang A/AAAA DNS-nya sudah pointing ke IP VPS
- Port 80 & 443 terbuka di firewall

#### Langkah deploy

```bash
# 1. Clone repo di VPS
git clone https://github.com/sayahafidz/fotoyu-downloader.git
cd fotoyu-downloader/web

# 2. Setup env
cp .env.example .env
# Edit .env — set NEXT_PUBLIC_APP_URL ke domain kamu,
# dan APP_DOMAIN juga ke domain kamu (untuk Caddy).

# 3. Edit Caddyfile — ganti fotoyu.example.com dengan domain kamu.

# 4. Build & jalankan
docker compose up -d --build
```

Setelah itu web app bisa diakses di `https://domain-kamu.com`. Caddy
otomatis mengambil sertifikat SSL dari Let's Encrypt.

#### Update / redeploy

```bash
cd fotoyu-downloader/web
git pull
docker compose up -d --build
```

#### Arsitektur Docker

```mermaid
flowchart LR
    Internet[Internet] -->|"HTTPS :443"| Caddy[Caddy reverse proxy]
    Caddy -->|"proxy_pass web:3000"| NextJS[Next.js container]
    NextJS -->|"fetch (server-side)"| CDN[cfsimgproxy.fototree.com]
    NextJS -->|"API calls"| API[api.fotoyu.com]
``

- **Caddy**: reverse proxy + auto HTTPS (Let's Encrypt). Cache response proxy.
- **Next.js**: standalone build, user `nextjs` non-root.
- **Network**: internal bridge, hanya Caddy yang exposed ke internet.

---

## Opsi B: Script Python (CLI)

### Requirements

- Python 3.10 atau lebih baru
- `aiohttp`
- `tqdm`

Semua dependency sudah disediakan via virtual environment (lihat Instalasi).

### Instalasi

Project ini sudah memiliki virtual environment (`.venv`) yang siap pakai.
Ikuti langkah berikut untuk mulai menggunakannya.

### 1. Buat dan aktivasi venv (jika belum ada)

Jika folder `.venv` sudah ada, lewati langkah pembuatan.

**Buat venv baru (Python 3.10+):**

```powershell
py -3.12 -m venv .venv
```

**Aktivasi venv:**

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Windows CMD
.\.venv\Scripts\activate.bat
```

Setelah aktif, prompt akan berubah menjadi `(.venv) ...`.

> Jika PowerShell menolak menjalankan `Activate.ps1` karena execution policy,
> jalankan sekali:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 2. Install dependencies ke venv

```powershell
# Pastikan venv sudah aktif, lalu:
python -m pip install -r requirements.txt
```

Atau tanpa aktivasi venv, panggil python venv langsung:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## Cara Menjalankan

### Opsi A — Pakai venv langsung (paling sederhana)

```powershell
.\.venv\Scripts\python.exe downloader.py
```

### Opsi B — Aktivasi venv dulu lalu jalankan

```powershell
# Aktivasi venv (sekali per session terminal)
.\.venv\Scripts\Activate.ps1

# Setelah aktif, jalankan script dengan python biasa
python downloader.py
```

Script akan:
1. Membaca `response-fotoyu.txt`.
2. Mengekstrak semua URL foto dari `result.data[]`.
3. Mengunduh semua foto secara concurrent ke folder `media/`.

Contoh output:

```
Input:       D:\PYTHON PROJECT\fotoyu downloader\response-fotoyu.txt
Output dir:  D:\PYTHON PROJECT\fotoyu downloader\media
Concurrency: 10
Found 34 items, 34 downloadable images.

Downloading: 100%|##########| 34/34 [00:00<00:00, 38.82file/s]

==================================================
Download summary
==================================================
  Total:     34
  Success:   34
  Skipped:   0 (already existed)
  Failed:    0
  Downloaded:4.90 MB
```

---

## Opsi Command Line

| Flag            | Short | Default              | Deskripsi |
|-----------------|-------|----------------------|-----------|
| `--input`       | `-i`  | `response-fotoyu.txt`| Path file response JSON |
| `--output`      | `-o`  | `media`              | Folder tujuan download |
| `--concurrency` | `-c`  | `10`                 | Jumlah download paralel |

### Contoh

Download dengan default:

```powershell
.\.venv\Scripts\python.exe downloader.py
```

Custom input/output dan 20 download paralel:

```powershell
.\.venv\Scripts\python.exe downloader.py -i response-fotoyu.txt -o media -c 20
```

Pakai venv yang sudah aktif:

```powershell
python downloader.py -c 20
```

---

## Struktur Output

```
fotoyu downloader/
├── .venv/                  # virtual environment Python (tidak perlu disentuh)
├── response-fotoyu.txt     # file response JSON (di-paste dari DevTools)
├── downloader.py           # script Python utama (Opsi B)
├── requirements.txt        # daftar dependency Python
├── README.md               # file ini
├── web/                    # Next.js web app (Opsi A)
│   ├── app/                # halaman + API routes
│   ├── components/         # komponen React
│   ├── lib/                # parser + download helper
│   └── package.json
└── media/                  # folder hasil download Python (dibuat otomatis)
    ├── ANN_7577.JPG
    ├── ANN_7583.JPG
    ├── AFR_7096.JPG
    └── ...
```

Foto disimpan dengan nama sesuai field `title` dari response (nama asli
foto saat diupload). Jika ada nama yang sama, suffix `_2`, `_3`, dst.
ditambahkan otomatis.

---

## Cara Kerja

```mermaid
flowchart TD
    A[Read response-fotoyu.txt] --> B[Parse JSON]
    B --> C[Extract result.data array]
    C --> D{Filter content_type == photo}
    D --> E[Build download list with title as filename]
    E --> F[Create media folder if missing]
    F --> G[Launch async semaphore-limited downloads]
    G --> H{For each URL}
    H --> I[Skip if file already exists - resume support]
    I --> J[Download with retry up to 3 attempts]
    J --> K[Save to media/title]
    K --> L[Update tqdm progress bar]
    L --> M[Print summary: success/failed/skipped]
```

1. Membaca dan parse JSON response.
2. Iterasi `result.data[]`, hanya ambil item dengan `content_type == "photo"`
   dan memiliki `url` valid.
3. Bangun daftar download yang sudah didedupe dengan nama file aman & unik.
4. Jalankan download concurrent dibatasi oleh `asyncio.Semaphore`.
5. Stream tiap response ke file `.part` lalu rename secara atomik saat sukses.
6. Retry hingga 3x dengan exponential backoff untuk download yang gagal.
7. Cetak ringkasan akhir (success / skipped / failed / total bytes).

---

## Exit Codes

- `0` — semua download sukses (atau di-skip karena sudah ada).
- `1` — file input tidak ditemukan atau JSON tidak valid.
- `2` — satu atau lebih download gagal setelah retry.

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'aiohttp'`

Venv belum aktif atau dependency belum terinstall. Jalankan:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Atau pastikan venv sudah diaktivasi sebelum memanggil `python`.

### `python downloader.py` error tapi `py -3.12` berhasil

Sistem punya beberapa Python terinstall. Selalu pakai venv project agar
dependency konsisten:

```powershell
.\.venv\Scripts\python.exe downloader.py
```

### Download gagal semua / HTTP 403

Response URL mungkin sudah expired atau butuh header tertentu. Pastikan:
1. Response diambil dari session yang **sudah login**.
2. Ambil response **segar** dari cart preview (jangan pakai response lama
   berhari-hari).

### `Activate.ps1 cannot be loaded because running scripts is disabled`

Jalankan sekali di PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Foto tidak terdownload semua

- Pastikan field `content_type` di item adalah `"photo"` (bukan video).
- Pastikan field `url` ada dan tidak kosong.
- Cek laporan ringkasan — bagian "Failed" menampilkan nama file yang gagal.

### Mau download ulang dari awal

Hapus folder `media` lalu jalankan ulang script:

```powershell
Remove-Item -Recurse -Force media
.\.venv\Scripts\python.exe downloader.py
```
