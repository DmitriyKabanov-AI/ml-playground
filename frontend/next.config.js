/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8004/api/:path*" }
    ];
  }
};
module.exports = nextConfig;
