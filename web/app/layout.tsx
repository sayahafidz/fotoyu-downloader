import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
