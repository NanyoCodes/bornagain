import { MetadataRoute } from 'next';

/**
 * @fileOverview Dynamically generates the sitemap for BornAgain Global to improve Google Search visibility.
 * All public routes are listed here with appropriate priority for maximum indexing efficiency.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bornagainglobal.com';
  const lastModified = new Date();

  // Define public routes with strategic priority for SEO
  const routes = [
    { path: '', priority: 1, changeFrequency: 'daily' },
    { path: '/testimonies', priority: 1, changeFrequency: 'daily' },
    { path: '/campaigns', priority: 0.9, changeFrequency: 'daily' },
    { path: '/territories', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/growth', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/fellowships', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/victory-hub', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/games', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/resources', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/guide', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/marketplace', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/marketplace/gifts', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/terms-of-service', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacy-policy', priority: 0.3, changeFrequency: 'monthly' },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency as any,
    priority: route.priority,
  }));
}
