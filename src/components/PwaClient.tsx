"use client";
import { useEffect } from "react";
export function PwaClient() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    let lastSent = 0;
    const active = () => {
      if (document.visibilityState !== "visible" || location.pathname === "/login" || Date.now() - lastSent < 60_000) return;
      lastSent = Date.now(); void fetch("/api/activity", { method: "POST" }).catch(() => undefined);
    };
    document.addEventListener("pointerdown", active, { passive: true });
    document.addEventListener("keydown", active); document.addEventListener("visibilitychange", active);
    active();
    return () => { document.removeEventListener("pointerdown", active); document.removeEventListener("keydown", active); document.removeEventListener("visibilitychange", active); };
  }, []);
  return null;
}
