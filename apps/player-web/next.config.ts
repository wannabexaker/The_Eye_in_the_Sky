import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eye/game-engine"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.olamov.com https://olamov.com"
          }
        ]
      }
    ];
  },
  onDemandEntries: {
    // Keep inactive dev pages in memory longer to reduce hot-reload churn.
    maxInactiveAge: 72 * 60 * 60 * 1000,
  },
  // API proxying is handled by the Route Handler at app/_api/[...path]/route.ts
  // which reads API_INTERNAL_URL at server startup (truly runtime, not baked
  // at build time like next.config.ts rewrites would be).
};

export default nextConfig;
