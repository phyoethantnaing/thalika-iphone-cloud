"use client";
import { FileText, History, Mic2, Settings2, Users } from "lucide-react";
import Link from "next/link";
export type AppTab = "script" | "voiceover" | "history" | "storage" | "settings" | "voices";
export function AppHeader({ activeTab }: { activeTab: AppTab }) {
  const tabs = [
    { id: "voiceover", href: "/", label: "Studio", icon: Mic2 },
    { id: "script", href: "/script", label: "Scripts", icon: FileText },
    { id: "history", href: "/history", label: "History", icon: History },
    { id: "voices", href: "/voices", label: "Voices", icon: Users },
    { id: "settings", href: "/settings", label: "Settings", icon: Settings2 }
  ];
  return <><div className="brand"><span className="brand-mark"><Mic2 size={22} /></span><span>Thalika<small>YOUR PRIVATE VOICE STUDIO</small></span></div><nav className="app-nav" aria-label="Main navigation">{tabs.map(({ id, href, label, icon: Icon }) => <Link key={id} href={href} aria-current={activeTab === id || (activeTab === "storage" && id === "settings") ? "page" : undefined}><Icon size={21} aria-hidden="true" /><span>{label}</span></Link>)}</nav></>;
}
