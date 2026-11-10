"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock3, ExternalLink, RefreshCw } from "lucide-react";
type Status = { host: "kaggle" | "local"; dashboardUrl: string; sessionEndsAt: string | null; ready: boolean; stage: string; activeJobs: number; error: string | null };
export function GpuStatus() {
  const [status, setStatus] = useState<Status>(); const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { const r = await fetch("/api/gpu/status", { cache: "no-store" }); const data = await r.json(); setStatus(data); setError(r.ok ? "" : data.error || "GPU status unavailable"); }
    catch { setError("Studio ကို ချိတ်ဆက်မရပါ။ Kaggle session ပြီးသွားနိုင်သည်။"); }
  }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 10_000); return () => clearInterval(timer); }, [refresh]);
  const kaggle = status?.host === "kaggle";
  return <section className="studio-card-bg panel"><p className="eyebrow">{kaggle ? "KAGGLE GPU" : "GPU"}</p>
    <div className="cloud-state" role="status"><span className={`state-light ${status?.ready ? "ready" : ""}`} />{status?.stage || "Checking…"}</div>
    {status?.sessionEndsAt && <p className="eyebrow" data-testid="kaggle-deadline"><Clock3 size={15}/> Session ends {new Date(status.sessionEndsAt).toLocaleString()}</p>}
    {!!status?.activeJobs && <p className="text-sm">Generating: {status.activeJobs} job</p>}
    <p className="text-sm leading-7">{kaggle
      ? "Kaggle notebook ပေါ်တွင် run နေသည်။ Session မပြီးမီ WAV များကို Download / Save to Files လုပ်ပါ။ နောက်တစ်ကြိမ်အတွက် notebook ကို Save & Run All ပြန်နှိပ်ပြီး log ထဲမှ link အသစ်ကိုဖွင့်ပါ။"
      : "Model ကို ဤကွန်ပျူတာပေါ်တွင် run နေသည်။ iPhone မှသုံးရန် Kaggle notebook ကို run ပါ (docs/KAGGLE.my.md)။"}</p>
    {status?.error && <p role="alert" className="notice">{status.error}</p>}{error && <p role="alert" className="notice">{error}</p>}
    <button className="secondary" onClick={() => void refresh()}><RefreshCw size={17}/> Refresh</button>
    <a className="secondary" href={status?.dashboardUrl || "https://www.kaggle.com/code"} target="_blank" rel="noreferrer">Kaggle notebooks <ExternalLink size={17}/></a>
  </section>;
}
