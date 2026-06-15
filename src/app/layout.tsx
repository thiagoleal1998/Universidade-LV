import type { Metadata } from 'next'
import { Montserrat, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { SettingsProvider } from '@/components/providers/settings-provider'
import { getSettings, getColorStyleTag } from '@/lib/settings'
import './globals.css'

const montserrat = Montserrat({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()

  const title = settings.seo_title || settings.site_name
  const description = settings.seo_description
  const canonical = settings.seo_canonical_url || undefined
  const ogImage = settings.seo_og_image || undefined

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords: settings.seo_keywords || undefined,
    authors: settings.seo_author ? [{ name: settings.seo_author }] : undefined,
    robots: settings.seo_robots || 'index,follow',
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      siteName: settings.site_name,
      title,
      description,
      locale: 'pt_BR',
      ...(canonical ? { url: canonical } : {}),
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(settings.seo_google_verification
      ? { verification: { google: settings.seo_google_verification } }
      : {}),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings()
  const colorStyle = getColorStyleTag(settings.primary_color)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: settings.site_name,
    description: settings.seo_description || settings.site_tagline,
    ...(settings.seo_canonical_url ? { url: settings.seo_canonical_url } : {}),
    ...(settings.logo_url ? { logo: settings.logo_url } : {}),
    ...(settings.seo_author ? { founder: { '@type': 'Person', name: settings.seo_author } } : {}),
    inLanguage: 'pt-BR',
    offers: {
      '@type': 'Offer',
      category: 'Online Course',
    },
  }

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${montserrat.variable} ${geistMono.variable} h-full`}
    >
      <head>
        {colorStyle && <style dangerouslySetInnerHTML={{ __html: colorStyle }} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SettingsProvider settings={settings}>
            {children}
            <Toaster richColors position="top-right" />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
