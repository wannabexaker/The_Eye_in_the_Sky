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
            // frame-ancestors covers the olamov.com iframe integration; a full
            // script-src CSP is deliberately omitted (PixiJS/Next inline
            // bootstrapping) — revisit with nonces if the embed surface grows.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.olamov.com https://olamov.com"
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()"
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
