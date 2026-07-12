import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@trpc/server"],
  transpilePackages: ["@shared"],
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: "http://localhost:3000/api/:path*",
    },
  ],
};

export default nextConfig;
