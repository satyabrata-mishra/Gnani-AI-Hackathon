import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps localhost demo recordings clean; compile and runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
