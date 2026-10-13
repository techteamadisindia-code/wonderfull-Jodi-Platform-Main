/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    return [
      {
        source: '/profiles/:id',
        destination: '/profile/:id',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // In production, Express directly serves /uploads and in-process Next.js routes.
    // Development proxy rewrite is only needed when Next.js dev server runs standalone on port 3000.
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    const backendPort = process.env.BACKEND_PORT || process.env.PORT || '5000';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || `http://127.0.0.1:${backendPort}`;
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
