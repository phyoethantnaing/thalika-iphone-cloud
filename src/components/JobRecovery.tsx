"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Job = { id: string; status: string; completedChunks?: number; totalChunks?: number; progressMessage?: string };
export function JobRecovery() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    async function refresh() { try { const r = await fetch("/api/history", { cache: "no-store" }); if (r.ok) setJobs((await r.json()).jobs || []); } catch { /* existing jobs remain visible */ } }
    void refresh(); const timer = setInterval(() => void refresh(), 5000); return () => clearInterval(timer);
  }, []);
  const active = jobs.filter(j => j.status === "generating");
  if (!active.length) return null;
  return <section className="notice grid gap-3 mb-5" aria-live="polite"><p>Generation continues on the server. You may reopen this page or History.</p>{active.map(j => <div key={j.id}><p>{j.progressMessage || "Queued"} · {j.completedChunks || 0}/{j.totalChunks || "…"}</p><div className="flex gap-3 mt-2"><Link href="/history" className="secondary">View jobs & results</Link><button className="secondary" onClick={async () => { if (confirm("Cancel this job? The current model call may finish first.")) await fetch(`/api/jobs/${j.id}/cancel`, { method: "POST" }); }}>Cancel</button></div></div>)}</section>;
}
