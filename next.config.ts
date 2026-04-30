import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // 1. Route specific Firebase action landing pages to our custom UI
      {
        source: '/__/auth/action',
        destination: '/auth/action',
      },
      {
        source: '/_/auth/action',
        destination: '/auth/action',
      },
      // 2. Proxy internal auth handler/handshake requests to the secure Firebase backend
      // This handles both the standard (__) and alternative (_) path patterns
      {
        source: '/__/auth/:path*',
        destination: `https://studio-6220967431-56fe2.firebaseapp.com/__/auth/:path*`,
      },
      {
        source: '/_/auth/:path*',
        destination: `https://studio-6220967431-56fe2.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
