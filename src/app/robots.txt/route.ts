import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `User-agent: *
Allow: /
Allow: /about
Allow: /contact
Allow: /resources
Allow: /guide
Allow: /testimonies
Allow: /campaigns
Allow: /growth
Allow: /fellowships
Disallow: /dashboard/
Disallow: /chats/
Disallow: /notifications/
Disallow: /profile/
Disallow: /settings/
Disallow: /souls-won/

Sitemap: https://testifyglobal.com/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
