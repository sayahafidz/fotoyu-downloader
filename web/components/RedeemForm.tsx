"use client";

import { useState } from "react";

export default function RedeemForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <form className="space-y-3 rounded-lg border border-[var(--rule)] bg-[var(--accent-soft)] p-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kode gagal ditukar.");
      setCode(""); setMessage(`Kode berhasil ditukar. Saldo kredit: ${data.balance}.`);
      window.dispatchEvent(new Event("watermark-quota-changed"));
    } catch (error) { setError(error instanceof Error ? error.message : "Kode gagal ditukar."); }
    finally { setBusy(false); }
  }}>
    <label htmlFor="redeem-code" className="block text-sm font-semibold">Punya kode kredit?</label>
    <div className="flex flex-col gap-3 sm:flex-row"><input id="redeem-code" required maxLength={21} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="FOTO-…" value={code} onChange={(event) => setCode(event.target.value)} className="field min-w-0 flex-1" /><button type="submit" disabled={busy || !code.trim()} className="btn-primary shrink-0">{busy ? "Menukar…" : "Tukar kode"}</button></div>
    <p className="text-xs text-slate-600 dark:text-slate-400">Kredit tersimpan di browser ini. Menghapus cookie atau pindah browser akan kehilangan akses ke saldo.</p>
    {message && <p role="status" className="text-sm">{message}</p>}{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </form>;
}
