import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps localhost demo recordings clean; compile and runtime errors still surface.
  devIndicators: false,
  // Lets a phone on the same Wi-Fi load the dev server's scripts; without them the page never becomes interactive.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
