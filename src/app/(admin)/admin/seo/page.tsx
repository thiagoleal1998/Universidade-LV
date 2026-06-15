import { getSettings } from '@/lib/settings'
import { SeoManager } from '@/components/admin/seo-manager'

export const metadata = { title: 'SEO' }

export default async function AdminSeoPage() {
  const settings = await getSettings()

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">SEO</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure como o site aparece no Google, redes sociais e inteligências artificiais.
        </p>
      </div>

      <SeoManager
        siteName={settings.site_name}
        seoTitle={settings.seo_title}
        seoDescription={settings.seo_description}
        seoKeywords={settings.seo_keywords}
        seoOgImage={settings.seo_og_image}
        seoCanonicalUrl={settings.seo_canonical_url}
        seoGoogleVerification={settings.seo_google_verification}
        seoRobots={settings.seo_robots}
        seoAuthor={settings.seo_author}
      />
    </div>
  )
}
