/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
<<<<<<< HEAD
  devIndicators: false,
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
<<<<<<< HEAD
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
    ];
  },
};

export default nextConfig;
<<<<<<< HEAD

=======
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
