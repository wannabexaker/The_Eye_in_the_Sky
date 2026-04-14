import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eye/shared-types"],
  // Proxy API calls server-side so the browser never needs a direct route to
  // the API container. API_INTERNAL_URL is resolved at server startup (not
  // baked at build time), making the image portable across deployments.
  async rewrites() {
    const apiUrl =
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3200";
    return [
      {
        source: "/_api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
