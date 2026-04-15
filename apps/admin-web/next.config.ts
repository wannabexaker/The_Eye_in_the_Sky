import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eye/shared-types"],
  // API proxying is handled by the Route Handler at app/_api/[...path]/route.ts
  // which reads API_INTERNAL_URL at server startup (truly runtime, not baked
  // at build time like next.config.ts rewrites would be).
};

export default nextConfig;
