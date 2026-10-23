import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "esbuild",
    "bullmq",
    "ioredis",
  ],
  transpilePackages: ["three", "@remotion/three", "@react-three/fiber", "@react-three/drei"]
};

export default nextConfig;
