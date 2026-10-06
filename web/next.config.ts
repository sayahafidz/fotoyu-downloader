import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bundle only the needed node_modules into a self-contained .next/standalone
  // folder. Required for the Docker production image.
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },
  turbopack: { root: path.resolve(__dirname) },
  async headers() {
    return [
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/admin", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.fotoyu.com https://*.fototree.com; connect-src 'self' https://*.fotoyu.com https://*.fototree.com${process.env.NODE_ENV === "development" ? " ws: wss:" : ""}; font-src 'self'; worker-src 'self' blob:; manifest-src 'self'` },
      ] },
    ];
  },
};

export default nextConfig;
