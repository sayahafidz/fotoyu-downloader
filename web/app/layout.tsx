import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DARK_MODE_SCRIPT } from "@/lib/dark-mode";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Fotoyu Downloader Mobile & Web",
  description:
    "Muat keranjang Fotoyu, pilih foto, dan simpan ke perangkat sebagai file foto atau ZIP.",
  keywords: ["fotoyu", "downloader", "photo", "batch download", "zip", "android", "pwa"],
  authors: [{ name: "sayahafidz" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FotoyuDL",
  },
  openGraph: {
    title: "Fotoyu Downloader Mobile & Web",
    description:
      "Pilih, lihat, dan unduh foto Fotoyu melalui browser di ponsel atau komputer.",
    type: "website",
  },
};

const SW_REGISTER_SCRIPT = `
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  });
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }}
          suppressHydrationWarning
        />
        <script
          dangerouslySetInnerHTML={{ __html: SW_REGISTER_SCRIPT }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
