import { NextResponse } from 'next/server';

/**
 * @fileOverview Dynamically generates the Web App Manifest.
 * Ensures the PWA icon is always synchronized with the current app logo.
 * Implements both 'any' and 'maskable' icon support for high-fidelity OS integration on Android and iOS.
 */

export async function GET() {
  const testifyLogoUrl = 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3';

  const manifest = {
    name: 'Testify Global',
    short_name: 'Testify',
    description: 'The global platform for sharing Christian testimonies and organizing the harvest.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#f97416',
    icons: [
      {
        src: testifyLogoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: testifyLogoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: testifyLogoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: testifyLogoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=59',
    },
  });
}
