/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tfcaedotumvtcenapbrm.supabase.co' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
    ],
  },
  experimental: { serverActions: { allowedOrigins: ['*'] } },
}

module.exports = nextConfig
