import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for small Docker images on the VPS.
  output: "standalone",
};

export default nextConfig;
