import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/opt/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      { source: '/favicon.svg', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      { source: '/favicon.png', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      { source: '/apple-touch-icon.png', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
    ];
  },
};

export default nextConfig;
