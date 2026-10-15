import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Thalika Voice Studio", short_name: "Thalika", description: "Private Burmese voice studio. GPU connection required for inference.", start_url: "/settings", scope: "/", display: "standalone", background_color: "#f2f4f7", theme_color: "#12805e", lang: "my", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
