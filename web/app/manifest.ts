import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fotoyu Downloader Mobile",
    short_name: "FotoyuDL",
    description: "Unduh foto resolusi tinggi dari fotoyu.com langsung di browser Android & Laptop dengan cepat",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#4f46e5",
    orientation: "portrait",
    categories: ["utilities", "productivity", "photography"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
