"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioPageShell } from "@/components/StudioPageShell";
import type { VoiceProfileSummary } from "@/lib/types";
export default function Voices() {
  const [profiles, setProfiles] = useState<VoiceProfileSummary[]>([]); const [error, setError] = useState("");
  async function load() { try { const r = await fetch("/api/voice-profiles"); if (!r.ok) throw new Error("Open the GPU Studio to access profiles"); setProfiles((await r.json()).profiles); } catch(e) { setError((e as Error).message); } }
  useEffect(() => { void load(); }, []);
  return <StudioPageShell activeTab="voices" badge="Consented voices" title="Your voices" description="သင်ပိုင်ဆိုင်သောအသံ သို့မဟုတ် ပိုင်ရှင်၏ခွင့်ပြုချက်ရှိသော အသံများကိုသာ သိမ်းပါ။"><div className="grid gap-4 sm:grid-cols-2"><section className="studio-card-bg panel"><h2>Reference library</h2><p>Studio မှ iPhone Files ဖြင့် အသံတင်ပြီး consent အတည်ပြုကာ profile သိမ်းပါ။</p><Link href="/" className="primary">Add a voice in Studio</Link><p role="alert">{error}</p></section>{profiles.map(p => <section key={p.id} className="studio-card-bg panel"><h2>{p.name}</h2><audio controls preload="none" src={`/api/voice-profiles/${p.id}/audio`}/><p className="text-sm">{p.referenceFilename} · {p.qualityReport.durationSeconds.toFixed(1)}s · Quality {p.qualityReport.score}/100</p><p className="text-xs">Consented: {p.consentedAt}</p><Link href={`/?voice=${p.id}`} className="secondary">Use voice in Studio</Link><button className="danger" onClick={async () => { if (!confirm("Delete this profile and its saved reference audio?")) return; const r = await fetch(`/api/voice-profiles/${p.id}`, { method: "DELETE" }); if (!r.ok) setError("Could not delete profile"); else await load(); }}>Delete profile</button></section>)}</div></StudioPageShell>;
}
