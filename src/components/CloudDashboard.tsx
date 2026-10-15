"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Power, RefreshCw, ExternalLink, Clock3 } from "lucide-react";
type Status = {
  mode: "studio" | "control"; stage?: string; modelReady?: boolean; gpu?: string | null; vramGb?: number | null;
  activeJobs?: { id: string }[] | null; runningSeconds?: number | null; hourlyRate?: number | null; estimatedPodCost?: number | null;
  networkVolumeId?: string | null; storageGb?: number | null; studioUrl?: string | null; controlUrl?: string | null;
  lastSuccessfulSession?: string | null; lastError?: string | null; startupLatencyMs?: number | null; error?: string;
  idleWarning?: boolean; idleTimeoutMinutes?: number; autoStop?: boolean; budgetUsd?: number; runtimeReachable?: boolean;
};
export function CloudDashboard() {
  const [status, setStatus] = useState<Status>(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    try { const r = await fetch("/api/cloud/status", { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setStatus(data); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Cannot verify provider state"); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 10_000); return () => clearInterval(timer); }, [refresh]);
  async function act(action: "start" | "stop") {
    const confirmation = action === "start" ? "Start or rent GPU compute? Provider charges begin when allocated. Verify current rates in Runpod first." : "Stop GPU compute now? Active jobs must finish first. Persistent storage charges continue.";
    if (!confirm(confirmation)) return;
    setBusy(true); setError(""); setMessage("");
    try { const r = await fetch("/api/cloud/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, confirmed: true, key: crypto.randomUUID() }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMessage(data.message || "Request accepted; checking provider state…"); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); } finally { setBusy(false); }
  }
  const minutes = status?.runningSeconds == null ? "Unknown" : `${Math.floor(status.runningSeconds / 3600)}h ${Math.floor(status.runningSeconds % 3600 / 60)}m ${Math.floor(status.runningSeconds % 60)}s`;
  return <section className="studio-card-bg panel"><p className="eyebrow">ON-DEMAND GPU</p><div className="cloud-state" role="status"><span className={`state-light ${status?.modelReady ? "ready" : ""}`} />{status?.stage || (status?.mode === "studio" ? "GPU control" : "Checking provider…")}</div>
    {status?.mode === "studio" ? <><p>GPU ပိတ်ထားချိန်တွင် သီးခြား control plane သို့မဟုတ် Runpod dashboard မှ ပြန်စတင်ပါ။</p>{status.controlUrl && <a className="primary" href={status.controlUrl}>Open GPU control <ExternalLink size={17}/></a>}<Link className="secondary" href="/">Open Studio</Link></> : <>
    <dl className="metric-grid">{[
      ["Provider", "Runpod"], ["GPU / VRAM", `${status?.gpu || "Not allocated"} · ${status?.vramGb == null ? "VRAM unreported" : `${status.vramGb} GB`}`],
      ["Session time", minutes], ["Provider Pod rate", status?.hourlyRate == null ? "Unavailable" : `$${status.hourlyRate.toFixed(3)}/h`],
      ["Estimated Pod cost", status?.estimatedPodCost == null ? "Unavailable" : `$${status.estimatedPodCost.toFixed(3)}`],
      ["Active jobs", status?.activeJobs == null ? "Cannot verify" : String(status.activeJobs.length)],
      ["Persistent volume", status?.networkVolumeId || "Not verified"], ["First Ready observed", status?.startupLatencyMs == null ? "Not measured yet" : `${(status.startupLatencyMs/1000).toFixed(0)} seconds`]
    ].map(([label, value]) => <div className="metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {status?.estimatedPodCost != null && status.estimatedPodCost >= (status.budgetUsd || 2) && <p className="notice" role="alert">Session budget warning. Stop the GPU when finished.</p>}
    {status?.idleWarning && <p className="notice" role="alert"><Clock3 className="inline" size={16}/> Idle timeout: {status.idleTimeoutMinutes} min. {status.autoStop ? "Safe automatic stop is enabled; return to Studio to stay active." : "Stop the GPU to avoid compute charges."}</p>}
    <div className="grid grid-cols-2 gap-3"><button className="primary" disabled={busy || !status || !!error} onClick={() => void act("start")}><Power size={18}/> Start GPU</button><button className="danger" disabled={busy || !status?.runtimeReachable || !!status.activeJobs?.length} onClick={() => void act("stop")}>Stop GPU</button></div>
    {status?.studioUrl && <a className="secondary" href={status.studioUrl}>Open Studio <ExternalLink size={17}/></a>}
    {status?.activeJobs?.map(job => <p key={job.id} className="text-sm">Active: {job.id}</p>)}
    <p className="text-sm text-slate-600">Last ready: {status?.lastSuccessfulSession || "Not recorded"}</p>
    {status?.lastError && <p role="alert" className="notice">{status.lastError}</p>}
    <p className="text-xs leading-6 text-slate-600">Rate comes from the provider&apos;s Pod record. The estimate excludes separately billed persistent storage, transfer, gateway, control service, and Gemini. Provider billing is authoritative. Storage continues to cost money after compute stops.</p></>}
    <button className="secondary" onClick={() => void refresh()} disabled={busy}><RefreshCw size={17}/> Refresh / retry connection</button>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="notice">{error}</p>}
    <a href="https://console.runpod.io/pods" target="_blank" rel="noreferrer" className="secondary">Runpod dashboard <ExternalLink size={17}/></a>
  </section>;
}
