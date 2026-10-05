// ==UserScript==
// @name         Fotoyu Mobile Helper (1-Tap Downloader)
// @namespace    https://github.com/sayahafidz/fotoyu-downloader
// @version      1.1.0
// @description  Tombol 1-klik untuk mengunduh semua foto keranjang fotoyu.com langsung ke Fotoyu Downloader (Android & Desktop)
// @author       sayahafidz
// @match        https://*.fotoyu.com/*
// @match        https://fotoyu.com/*
// @icon         https://fakyu.sayahafidz.my.id/icon-192.png
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const APP_URL = "https://fakyu.sayahafidz.my.id";

  function injectFloatingButton() {
    if (document.getElementById('fotoyu-dl-mobile-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'fotoyu-dl-mobile-btn';
    btn.innerHTML = `
      <span style="font-size:18px;">⚡</span>
      <span style="font-size:13px;font-weight:700;letter-spacing:-0.01em;">Download Foto</span>
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 84px;
      right: 16px;
      z-index: 999999;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 9999px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.45);
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      touch-action: manipulation;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
      -webkit-user-select: none;
    `;

    btn.addEventListener('touchstart', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('touchend', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      btn.innerHTML = `<span>⏳</span><span style="font-size:13px;font-weight:700;">Mengambil data...</span>`;
      btn.style.opacity = '0.85';

      const script = document.createElement('script');
      script.src = `${APP_URL}/android-inject.js?t=${Date.now()}`;
      document.body.appendChild(script);

      setTimeout(() => {
        btn.innerHTML = `<span style="font-size:18px;">⚡</span><span style="font-size:13px;font-weight:700;">Download Foto</span>`;
        btn.style.opacity = '1';
      }, 4000);
    });

    document.body.appendChild(btn);
  }

  // Check periodically since single page apps (SPA) re-render views
  setInterval(injectFloatingButton, 1500);
})();
