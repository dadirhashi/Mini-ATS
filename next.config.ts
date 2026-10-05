import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Standard är 1 MB. Höjt så att CV som PDF (max 4 MB) kan skickas.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;