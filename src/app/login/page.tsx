"use client";
import { useState } from "react";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="auth-shell"><form className="studio-card-bg panel" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    const password = new FormData(e.currentTarget).get("password");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      location.assign("/settings");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); } finally { setBusy(false); }
  }}><p className="eyebrow">THALIKA · PRIVATE STUDIO</p><h1 className="text-3xl font-semibold">ပြန်လည်ကြိုဆိုပါတယ်</h1><p>သင့်အသံနှင့် စာသားများကို ကာကွယ်ရန် ဝင်ရောက်ပါ။</p><label>Owner password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} /></label><button className="primary" disabled={busy}>{busy ? "Signing in…" : "ဝင်ရောက်မည်"}</button><p role="alert" className="text-red-700">{error}</p><p className="text-xs">First setup: run npm run setup:owner on your server.</p></form></main>;
}
