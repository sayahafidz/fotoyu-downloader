import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Bundle only the needed node_modules into a self-contained .next/standalone
  // folder. Required for the Docker production image.
  output: "standalone",
};

export default nextConfig;
