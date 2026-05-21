import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `User-agent: *
Allow: /
Allow: /about
Allow: /contact
Allow: /resources
Allow: /guide
Disallow: /dashboard/
Disallow: /chats/
Disallow: /notifications/
Disallow: /profile/
Disallow: /settings/
Disallow: /souls-won/
Disallow: /testimonies/
Disallow: /progress/

Sitemap: https://testifyglobal.com/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
