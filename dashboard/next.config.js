// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vride/shared'],
  images: {
    domains: ['storage.googleapis.com', 'firebasestorage.googleapis.com'],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

module.exports = nextConfig;
