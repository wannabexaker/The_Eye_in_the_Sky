import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eye/game-engine"],
  onDemandEntries: {
    // Keep inactive dev pages in memory longer to reduce hot-reload churn.
    maxInactiveAge: 72 * 60 * 60 * 1000,
  },
};

export default nextConfig;
