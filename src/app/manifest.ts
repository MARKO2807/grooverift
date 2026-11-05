import type { MetadataRoute } from "next";

// Web app manifest with the Phase 3 icons (D-083). The badge is for Android notifications later.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GrooveRift",
    short_name: "GrooveRift",
    description: "Tvoja glazbena zajednica.",
    lang: "hr",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0D12",
    theme_color: "#0B0D12",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
