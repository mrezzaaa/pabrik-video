import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['remotion', '@remotion/player'],
  experimental: {
    // any experimental flags
  },
};

export default nextConfig;
