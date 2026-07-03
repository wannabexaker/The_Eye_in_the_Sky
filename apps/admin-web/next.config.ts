import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eye/shared-types"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The admin panel is never embedded — deny all framing.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
  // API proxying is handled by the Route Handler at app/_api/[...path]/route.ts
  // which reads API_INTERNAL_URL at server startup (truly runtime, not baked
  // at build time like next.config.ts rewrites would be).
};

export default nextConfig;
