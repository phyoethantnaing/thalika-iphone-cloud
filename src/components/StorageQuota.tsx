"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export function StorageQuota() {
  const [usage, setUsage] = useState<{ usedBytes: number; freeBytes: number; quotaBytes: number; percent: number }>();
  useEffect(() => { void fetch("/api/storage/usage").then(r => r.ok ? r.json() : undefined).then(setUsage).catch(() => undefined); }, []);
  const gb = (n: number) => `${(n / 1024**3).toFixed(2)} GiB`;
  return <section className="studio-card-bg panel mb-5"><h2>Persistent storage</h2><p>{usage ? `${gb(usage.usedBytes)} / ${gb(usage.quotaBytes)} data quota · ${gb(usage.freeBytes)} filesystem space available` : "Checking storage…"}</p>{usage && <progress className="w-full" max={100} value={Math.min(100,usage.percent)} aria-label="Data quota used"/>}<p className="text-sm">Models and backups also consume volume capacity. Model cache is outside this application-data quota. Nothing is deleted automatically.</p><div className="grid grid-cols-2 gap-3"><Link className="secondary" href="/history">Review outputs</Link><Link className="secondary" href="/voices">Review voices</Link></div></section>;
}
