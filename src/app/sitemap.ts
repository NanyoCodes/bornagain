import { MetadataRoute } from 'next';

/**
 * @fileOverview Dynamically generates the sitemap for Testify Global to improve Google Search visibility.
 * All public routes are listed here to ensure full indexing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://testifyglobal.com';
  const lastModified = new Date();

  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/resources',
    '/guide',
    '/testimonies',
    '/campaigns',
    '/progress',
    '/fellowships',
    '/login',
    '/terms-of-service',
    '/privacy-policy',
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '' || route === '/testimonies' || route === '/campaigns' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
