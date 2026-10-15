"use client";
import Link from "next/link";
import { CloudDashboard } from "@/components/CloudDashboard";
import { StudioPageShell } from "@/components/StudioPageShell";
export default function Settings() {
  return <StudioPageShell activeTab="settings" badge="Private workspace" title="Settings" description="အသုံးပြုချိန်မှသာ GPU ဖွင့်ပါ။ ပြီးလျှင် ပိတ်ထားကြောင်း အတည်ပြုပါ။"><div className="grid gap-5 lg:grid-cols-2"><CloudDashboard/><section className="studio-card-bg panel"><h2>Your workspace</h2><Link className="secondary" href="/storage">Storage, quota & cleanup</Link><Link className="secondary" href="/script">Script & Gemini settings</Link><p className="text-sm leading-7">iPhone Safari → Share → Add to Home Screen ဖြင့် install လုပ်ပါ။ Offline တွင် GPU inference မရပါ။ ပထမဆုံး model download နှင့် startup ကြာနိုင်ပါသည်။</p><button className="secondary" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.assign("/login"); }}>Sign out</button></section></div></StudioPageShell>;
}
