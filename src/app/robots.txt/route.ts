import { NextResponse } from 'next/server';

/**
 * @fileOverview Serves the robots.txt file to search engine crawlers.
 * Configured to allow indexing of public-facing mission content while
 * protecting private user data and internal app logic.
 */
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
Allow: /victory-hub
Allow: /marketplace
Allow: /marketplace/gifts

# Prevent indexing of private/dynamic user routes
Disallow: /dashboard/
Disallow: /chats/
Disallow: /notifications/
Disallow: /profile/
Disallow: /settings/
Disallow: /souls-won/
Disallow: /matchmaking/

Sitemap: https://bornagainglobal.com/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
