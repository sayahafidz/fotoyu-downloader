# Fotoyu Downloader

Fast concurrent downloader untuk foto dari [fotoyu.com](https://fotoyu.com).
Script ini membaca file JSON response dari API cart preview fotoyu, mengekstrak
semua URL foto, lalu mengunduhnya secara concurrent ke folder `media/`.

---

## Daftar Isi

- [Fitur](#fitur)
- [Requirements](#requirements)
- [Instalasi](#instalasi)
- [Cara Mendapatkan Response dari Fotoyu](#cara-mendapatkan-response-dari-fotoyu)
- [Cara Menjalankan](#cara-menjalankan)
- [Opsi Command Line](#opsi-command-line)
- [Struktur Output](#struktur-output)
- [Cara Kerja](#cara-kerja)
- [Exit Codes](#exit-codes)
- [Troubleshooting](#troubleshooting)

---

## Fitur

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

## Requirements

- Python 3.10 atau lebih baru
- `aiohttp`
- `tqdm`

Semua dependency sudah disediakan via virtual environment (lihat Instalasi).

---

## Instalasi

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

## Cara Mendapatkan Response dari Fotoyu

Script ini butuh file `response-fotoyu.txt` berisi JSON response dari endpoint
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
   > Tips: kamu bisa pakai kotak filter dan ketik `carts/preview` untuk
   > mempersempit pencarian. Klik request-nya untuk membuka panel detail.

### Langkah 4 — Salin response

1. Pada panel detail request, buka tab **Response** (atau **Preview**).
2. Salin seluruh isi response (berupa JSON) — klik kanan → **Copy response**,
   atau salin manual teks JSON-nya.
3. Paste ke file `response-fotoyu.txt` di folder project ini, **menimpa**
   isi yang lama.

   ```powershell
   # Bisa juga diedit dengan editor apa pun (VSCode, Notepad, dll.)
   notepad response-fotoyu.txt
   ```

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

Setelah file `response-fotoyu.txt` berisi response terbaru, lanjut ke
[Cara Menjalankan](#cara-menjalankan).

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
├── .venv/                  # virtual environment (tidak perlu disentuh)
├── response-fotoyu.txt     # file response JSON (di-paste dari DevTools)
├── downloader.py           # script utama
├── requirements.txt        # daftar dependency
├── README.md               # file ini
└── media/                  # folder hasil download (dibuat otomatis)
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
