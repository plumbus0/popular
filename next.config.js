/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from any domain - required for Supabase storage URLs and user-provided URLs
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
