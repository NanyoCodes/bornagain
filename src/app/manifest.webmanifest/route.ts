import { NextResponse } from 'next/server';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const logo = PlaceHolderImages.find((img) => img.id === 'logo');
const testifyLogoUrl = logo?.imageUrl || '';

export async function GET() {
  const manifest = {
    name: 'Testify',
    short_name: 'Testify',
    description: 'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
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
        sizes: '512x512',
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
        purpose: 'maskable'
      },
    ],
  };

  return NextResponse.json(manifest);
}
