/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    // Internal Express backend address.
    // CRITICAL: NEVER proxy to https://wonderfuljodi.com because that creates an infinite proxy loop.
    // Next.js rewrites execute on the server and must proxy directly to the internal Express server on 127.0.0.1.
    const internalBackend = (
      process.env.INTERNAL_BACKEND_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.NODE_ENV === 'production'
        ? `http://127.0.0.1:${process.env.BACKEND_PORT || (process.env.PORT && process.env.FRONTEND_PORT ? process.env.PORT : '5000')}`
        : 'http://127.0.0.1:5000')
    ).trim().replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${internalBackend}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${internalBackend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

