import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for small Docker images on the VPS.
  output: "standalone",
  experimental: {
    serverActions: {
      // Each of the three initial ledger amounts can carry a 5 MB image.
      // Application validation still enforces 5 MB per individual file.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
