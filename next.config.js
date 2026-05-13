/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['better-auth', '@better-auth/drizzle-adapter'],
};

module.exports = nextConfig;