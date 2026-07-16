import type { Metadata } from "next";
import "./globals.css";
import { DARK_MODE_SCRIPT } from "@/lib/dark-mode";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "Fotoyu Downloader",
  description:
    "Paste response fotoyu, klik Proses, lalu download semua foto dalam satu klik. Concurrent, cepat, dan gratis.",
  keywords: ["fotoyu", "downloader", "photo", "batch download", "zip"],
  authors: [{ name: "sayahafidz" }],
  openGraph: {
    title: "Fotoyu Downloader",
    description:
      "Paste response fotoyu, klik Proses, lalu download semua foto dalam satu klik.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
