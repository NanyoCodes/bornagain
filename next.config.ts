import type {NextConfig} from 'next';

const bornAgainLogoUrl = 'https://i.postimg.cc/GmLp6x1W/Radiant-Dove-Born-Again-Logo.png';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://*.firebaseapp.com https://apis.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.unsplash.com https://i.ibb.co https://i.postimg.cc https://picsum.photos https://*.firebasestorage.googleapis.com https://lh3.googleusercontent.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' https://*.firebaseapp.com https://www.youtube.com https://*.youtube-nocookie.com;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.googleapis.com https://google.com https://bible-api.com;
    upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
          }
        ],
      },
    ];
  },
  async rewrites() {
    return [
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'i.postimg.cc' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;