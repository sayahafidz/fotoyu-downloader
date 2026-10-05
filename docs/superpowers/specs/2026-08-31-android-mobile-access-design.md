# Design Spec: Android Mobile-First Access & PWA Downloader

**Date:** 2026-08-31  
**Status:** Approved  
**Topic:** Android Mobile-First Optimization & Direct Access without Laptop  

---

## 1. Problem Statement & Goals

### 1.1 Problem
Saat ini pengguna harus membuka laptop atau menyalakan Developer Tools (F12) untuk membuka fotoyu.com dalam mode mobile toolbar dan menyalin respon network atau menjalankan console script agar dapat mengunduh foto keranjang fotoyu.com. Pengguna yang hanya memegang HP Android kesulitan karena Chrome Android tidak memiliki tombol Inspect / F12 langsung.

### 1.2 Goals
1. Memungkinkan pengguna Android mengakses dan mendownload foto langsung dari smartphone tanpa perlu laptop/PC.
2. Menyediakan mekanisme 1-klik / Bookmarklet yang kompatibel dengan Chrome/Kiwi/Samsung Internet di Android (menggunakan Address Bar Bookmarklet & Share Target).
3. Menyediakan dukungan Userscript (Tampermonkey/Violentmonkey) untuk browser Android yang mendukung ekstensi (Kiwi Browser, Firefox Android, Lemur).
4. Menyediakan UI Mobile-First dengan PWA (Progressive Web App) sehingga aplikasi dapat di-install ke Home Screen Android layaknya aplikasi native (`manifest.json` + `sw.js` + Web Share API).
5. Memperbaiki handling download di Android (menghindari memory crash pada ZIP besar dengan chunking dan opsi direct sequential batch download).

---

## 2. Architecture & Workflows

### 2.1 Android Cart Extraction Methods
Tersedia 3 jalur ekstraksi data cart dari Android:

1. **Jalur Utama: Android Address Bar Bookmarklet (Chrome Android & Samsung Internet)**
   - Pengguna membuat bookmark di browser HP dengan URL:
     `javascript:(function(){var a=document.createElement('script');a.src='https://<APP_URL>/android-inject.js?t='+Date.now();document.body.appendChild(a);})();`
   - Atau langsung mengeksekusi self-contained minified javascript yang membaca `localStorage.getItem("persist:root")` lalu melakukan same-site fetch ke `https://api.fotoyu.com/gs/v1/carts/preview` dan me-redirect ke `<APP_URL>/#cart=<encoded_json>`.
   - Di Chrome Android, pengguna cukup mengetik nama bookmark (misal `fotoyu`) di address bar saat membuka fotoyu.com dan mengetuknya.

2. **Jalur Ekstensi: Userscript (Kiwi Browser / Firefox Android)**
   - Menyediakan 1-klik tombol instalasi Userscript (`fotoyu-mobile-helper.user.js`).
   - Saat pengguna membuka `fotoyu.com/cart` di browser Android dengan ekstensi Tampermonkey/Violentmonkey, floating button **"⚡ Download via Downloader"** akan muncul otomatis di pojok layar.

3. **Jalur Alternatif: Quick Token Paste / Direct JSON**
   - Panduan praktis salin data bagi pengguna Android via `chrome://inspect` atau bookmarklet extractor sederhana.

---

## 3. UI/UX & PWA Enhancements

### 3.1 PWA (Progressive Web App)
- `web/public/manifest.json`:
  - `name`: "Fotoyu Downloader Mobile"
  - `short_name`: "FotoyuDL"
  - `display`: "standalone"
  - `start_url`: "/"
  - `theme_color`: "#4f46e5"
  - `background_color`: "#090d16"
  - `icons`: Icon 192x192 & 512x512
- Web App Install Banner prompt: Notifikasi interaktif "Install Aplikasi di HP" saat dibuka di Android.

### 3.2 Mobile-First Layout
- Bottom Action Bar yang fixed/sticky di bagian bawah layar HP saat preview foto aktif (`Download Semua`, `Pilih`, `AI Watermark toggle`).
- Grid responsif: 2 kolom compact di layar mobile portrait dengan pinch-to-zoom / tap-to-expand lightbox yang touch-friendly (swipe left/right gesture).
- Web Share Target API: Integrasi tombol `Share Foto / ZIP` langsung ke galeri, WhatsApp, Google Drive, atau File Manager Android.

---

## 4. Mobile Download Engine Optimization

### 4.1 Memory-Efficient Download for Mobile
- HP Android memiliki batasan memori RAM browser yang lebih ketat dibanding PC.
- Untuk cart besar (>20 foto beresolusi tinggi), JSZip in-memory generation dilengkapi dengan opsi fallback:
  - **Opsi ZIP**: Kompresi bertahap dengan garbage collection trigger / buffer pooling.
  - **Opsi Direct Batch (Sequential)**: Mengunduh foto satu per satu secara berurutan langsung ke folder Downloads browser tanpa membungkus ZIP, jika memori perangkat terbatas atau jika user menginginkan file langsung tersimpan di galeri.

---

## 5. Implementation Files & Components

1. **`web/public/manifest.json` & `web/app/manifest.ts`**: Konfigurasi PWA & icon metadata.
2. **`web/public/android-inject.js` & `web/public/fotoyu-mobile-helper.user.js`**: Skrip injektor khusus mobile browser.
3. **`web/components/AndroidGuideModal.tsx` / `web/components/MobileQuickStart.tsx`**: Panduan interaktif bertahap bergambar/animasi untuk pengguna Android.
4. **`web/components/ModeTabs.tsx` & `web/components/BookmarkletSection.tsx`**: Update label tab dan penambahan panduan khusus Android Chrome vs Laptop.
5. **`web/components/PhotoGrid.tsx` & `web/components/PhotoCard.tsx`**: Sticky bottom mobile bar, touch gestures swipe di Lightbox.
6. **`web/lib/download.ts`**: Penambahan mode unduh `downloadBatchDirectSequential` untuk Android.

---

## 6. Self-Review & Verification

- **Placeholder scan:** No TBD or placeholders. All flows explicitly defined.
- **Internal consistency:** Fully compatible with Next.js 16 standalone & Docker/Vercel deployments.
- **Scope check:** Focused purely on Android/Mobile convenience, PWA, and reliable mobile downloads.
