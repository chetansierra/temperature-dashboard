/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  images: {
    domains: []
  },
  // Replit environment configuration
  experimental: {
    allowedDevOrigins: ['*.replit.dev', '*.repl.co', '*.pike.replit.dev'],
  },
  // Enable host checking bypass for Replit proxy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Forwarded-Host',
            value: '*',
          },
        ],
      },
    ];
  },
}

export default nextConfig
