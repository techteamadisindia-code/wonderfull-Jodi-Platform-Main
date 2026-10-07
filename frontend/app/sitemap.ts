import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://wonderfuljodi.com';
  const routes = [
    '',
    '/about',
    '/membership',
    '/search',
    '/kundali-match',
    '/biodata-maker',
    '/astrology',
    '/awards',
    '/blog',
    '/stories',
    '/success-stories',
    '/careers',
    '/contact',
    '/how-it-works',
    '/terms-and-conditions',
    '/privacy-policy',
    '/verification-policy',
    '/safety',
    '/help',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));
}
