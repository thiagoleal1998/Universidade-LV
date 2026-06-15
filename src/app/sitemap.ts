import { MetadataRoute } from 'next'
import { getSettings } from '@/lib/settings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings()
  const baseUrl = (settings.seo_canonical_url || 'https://universidadelv.com.br').replace(/\/$/, '')

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
