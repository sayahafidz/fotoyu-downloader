import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DARK_MODE_SCRIPT } from "@/lib/dark-mode";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Fotoyu Downloader Mobile & Web",
  description:
    "Unduh foto resolusi tinggi dari fotoyu.com langsung di Android & PC dalam satu klik. Concurrent, cepat, dan gratis.",
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
      "Unduh foto resolusi tinggi dari fotoyu.com langsung di browser Android & PC. Cepat & tanpa ribet.",
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
