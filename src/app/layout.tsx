import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaClient } from "@/components/PwaClient";

export const metadata: Metadata = {
  title: "Thalika",
  description: "Private Burmese voice studio",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Thalika" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/icon-192.png" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#12805e", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="my">
      <body><PwaClient />{children}</body>
    </html>
  );
}
