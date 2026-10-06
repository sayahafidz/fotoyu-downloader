"use client";

import { useCallback, useEffect, useState } from "react";
import DarkModeToggle from "@/components/DarkModeToggle";

interface Code { code: string; credits: string; maxUses: string; uses: string; active: string; expiresAt: string }

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [credits, setCredits] = useState(5);
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(7);
  const [codes, setCodes] = useState<Code[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loadCodes = useCallback(async () => { const data = await api("/api/admin/codes"); setCodes(data.codes); }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store" }).then(async (response) => {
      if (!active) return;
      if (response.ok) { setAuthenticated(true); await loadCodes(); }
      else if (response.status !== 401) { const data = await response.json(); setError(data.error || "Sesi gagal dimuat."); }
    }).catch(() => { if (active) setError("Server tidak dapat dihubungi."); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [loadCodes]);
  const action = async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (error) { setError(error instanceof Error ? error.message : "Permintaan gagal."); }
    finally { setBusy(false); }
  };
  return <main className="app-shell">
    <header className="app-header"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3"><a href="/" className="app-wordmark">Fotoyu<span>Admin</span></a><DarkModeToggle /></div></header>
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl">Kontrol kredit</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Buat dan kelola kode kredit hapus watermark.</p></div>{authenticated && <button type="button" disabled={busy} className="btn-secondary" onClick={() => action(async () => { await api("/api/admin/session", { method: "DELETE" }); setAuthenticated(false); setCodes([]); })}>Keluar</button>}</div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {message && <p role="status" className="tool-panel p-4 text-sm">{message}</p>}
      {checking ? <p role="status">Memuat sesi…</p> : !authenticated ? <form className="import-panel mx-auto max-w-md space-y-4" onSubmit={(event) => { event.preventDefault(); action(async () => { await api("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) }); setPassword(""); setAuthenticated(true); await loadCodes(); }); }}>
        <h2 className="text-xl font-semibold">Login admin</h2><label htmlFor="admin-password" className="block text-sm font-medium">Password</label><input id="admin-password" type="password" autoComplete="current-password" required maxLength={512} value={password} onChange={(event) => setPassword(event.target.value)} className="field" /><button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Memeriksa…" : "Masuk"}</button>
      </form> : <>
        <form className="tool-panel space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); action(async () => { const result = await api("/api/admin/codes", { method: "POST", body: JSON.stringify({ credits, maxUses, days }) }); await loadCodes(); setMessage(`Kode dibuat: ${result.code}`); }); }}>
          <h2 className="text-xl font-semibold">Buat kode redeem</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium"><span>Kredit per penukaran</span><input type="number" min={1} max={1000} required className="field" value={credits} onChange={(event) => setCredits(Number(event.target.value))} /></label>
            <label className="space-y-2 text-sm font-medium"><span>Maksimal penukaran</span><input type="number" min={1} max={1000} required className="field" value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></label>
            <label className="space-y-2 text-sm font-medium"><span>Berlaku (hari)</span><input type="number" min={1} max={365} required className="field" value={days} onChange={(event) => setDays(Number(event.target.value))} /></label>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Satu browser bisa menukar kode yang sama sekali. Kredit dipakai setelah kuota gratis harian habis.</p>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? "Menyimpan…" : "Buat kode"}</button>
        </form>
        <section className="space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Kode terbaru</h2><button type="button" disabled={busy} className="btn-quiet" onClick={() => action(loadCodes)}>Muat ulang</button></div>
          {!codes.length && <p className="tool-panel p-5">Belum ada kode. Buat kode pertama di atas.</p>}
          {codes.map((code) => { const expired = Number(code.expiresAt) <= Date.now(); const unavailable = code.active !== "1" || expired || Number(code.uses) >= Number(code.maxUses); return <article key={code.code} className="tool-panel space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><code className="break-all text-sm font-semibold">{code.code}</code><span className="text-sm">{code.active !== "1" ? "Dinonaktifkan" : expired ? "Kedaluwarsa" : unavailable ? "Habis" : "Aktif"}</span></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{code.credits} kredit · {code.uses}/{code.maxUses} penukaran · Berlaku sampai {new Date(Number(code.expiresAt)).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>
            <div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={() => action(async () => { await navigator.clipboard.writeText(code.code); setMessage("Kode tersalin."); })}>Salin kode</button>{!unavailable && <button type="button" disabled={busy} className="btn-quiet" onClick={() => action(async () => { await api("/api/admin/codes", { method: "DELETE", body: JSON.stringify({ code: code.code }) }); await loadCodes(); setMessage("Kode dinonaktifkan."); })}>Nonaktifkan</button>}</div>
          </article>; })}
        </section>
      </>}
    </div>
  </main>;
}
