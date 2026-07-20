import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Gateway is a headless API - no images, no pages to optimise.
  reactStrictMode: true,
};

export default nextConfig;
