
import { NextResponse } from 'next/server';

/**
 * @fileOverview Dynamically generates the Web App Manifest for BornAgain.
 */

export async function GET() {
  const bornAgainLogoUrl = 'https://i.postimg.cc/cJmZDHJB/Whats-App-Image-2026-11-04-at-09-31-55.jpg';

  const manifest = {
    name: 'BornAgain Global',
    short_name: 'BornAgain',
    description: 'The global platform for the new creation in Christ. Share testimonies and organize the harvest.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#f97416',
    icons: [
      {
        src: bornAgainLogoUrl,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any'
      },
      {
        src: bornAgainLogoUrl,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable'
      },
      {
        src: bornAgainLogoUrl,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any'
      },
      {
        src: bornAgainLogoUrl,
        sizes: '512x512',
        type: 'image/jpeg',
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
