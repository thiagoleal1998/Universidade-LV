import { MetadataRoute } from 'next'
import { getSettings } from '@/lib/settings'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings()
  const baseUrl = settings.seo_canonical_url || 'https://universidadelv.com.br'
  const noIndex = settings.seo_robots?.includes('noindex')

  return {
    rules: [
      {
        userAgent: '*',
        allow: noIndex ? [] : ['/', '/login'],
        disallow: ['/admin/', '/dashboard/', '/api/', '/print/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
