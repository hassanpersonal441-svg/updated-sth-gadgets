/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/admin-sth-gadgets',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/admin-sthgadgets',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/admin-sth-gadets',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
