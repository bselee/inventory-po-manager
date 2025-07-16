/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build configuration for Vercel deployment
  swcMinify: false,
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Environment variables will be added later
}

module.exports = nextConfig