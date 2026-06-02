/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The BullMQ queue + worker libs are server-only; keep them out of the
    // client/server-component bundle (Next 14 key).
    serverComponentsExternalPackages: ["bullmq", "ioredis", "@prisma/client"],
  },
};

export default nextConfig;
