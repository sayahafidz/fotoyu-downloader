/**
 * Fotoyu Downloader - Mobile & Android Injector
 * Seamlessly extracts cart data from fotoyu.com and redirects to Fotoyu Downloader.
 */
(function () {
  const DEFAULT_APP_URL = window.__FOTOYU_APP_URL || (
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? location.origin
      : "https://fakyu.sayahafidz.my.id"
  );

  function showToast(message, type = "info") {
    const existing = document.getElementById("fotoyu-dl-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "fotoyu-dl-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: ${type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#4f46e5"};
      color: white;
      padding: 12px 20px;
      border-radius: 9999px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fotoyuFadeIn 0.3s ease;
      max-width: 90vw;
      text-align: center;
    `;
    toast.innerHTML = `<span>⚡</span><span>${message}</span>`;
    document.body.appendChild(toast);
  }

  function fallbackRedirect(persistRoot, appUrl) {
    showToast("Mengalihkan ke Downloader...", "info");
    setTimeout(() => {
      location.href = appUrl + "/#t=" + encodeURIComponent(persistRoot);
    }, 500);
  }

  const persistRoot = localStorage.getItem("persist:root");
  if (!persistRoot) {
    showToast("Belum login di fotoyu.com! Silakan login dulu.", "error");
    alert("⚠️ Kamu belum login di fotoyu.com. Silakan login terlebih dahulu, lalu jalankan bookmarklet ini lagi.");
    return;
  }

  let token = null;
  try {
    const parsed = JSON.parse(persistRoot);
    const userStr = parsed.user;
    if (typeof userStr === "string") {
      const user = JSON.parse(userStr);
      if (user && user.access_token) {
        token = user.access_token;
      }
    }
  } catch (e) {
    console.error("[FotoyuDL] Error parsing persist:root:", e);
  }

  const appUrl = DEFAULT_APP_URL;

  if (!token) {
    // Regex fallback for truncated root
    const match = persistRoot.match(/\\?"access_token\\?"\s*:\s*\\?"(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\\?"/);
    if (match && match[1]) {
      token = match[1];
    }
  }

  if (!token) {
    fallbackRedirect(persistRoot, appUrl);
    return;
  }

  showToast("Mengambil data keranjang foto...", "info");

  fetch("https://api.fotoyu.com/gs/v1/carts/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/plain, */*",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ page: 1, limit: 100, selected_products: [] })
  })
    .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
    .then((result) => {
      if (result.ok && result.json && result.json.result && Array.isArray(result.json.result.data)) {
        if (result.json.result.data.length === 0) {
          showToast("Keranjang kosong! Tambahkan foto dulu.", "error");
          alert("⚠️ Keranjang belanja fotoyu kamu masih kosong. Tambahkan foto ke keranjang dulu sebelum mendownload.");
          return;
        }
        showToast(`Ditemukan ${result.json.result.data.length} foto! Mengalihkan...`, "success");
        setTimeout(() => {
          location.href = appUrl + "/#cart=" + encodeURIComponent(JSON.stringify(result.json));
        }, 400);
      } else {
        fallbackRedirect(persistRoot, appUrl);
      }
    })
    .catch((err) => {
      console.warn("[FotoyuDL] Direct fetch failed, using token fallback:", err);
      fallbackRedirect(persistRoot, appUrl);
    });
})();
