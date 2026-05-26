import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

// Proxy /api/* through Next.js to the backend. Browser sees same-origin
// requests, so CORS preflight is never triggered.
const API_TARGET = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!API_TARGET) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
