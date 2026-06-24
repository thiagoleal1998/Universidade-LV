import type { Metadata } from 'next'
import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import {
  Radio, BookOpen, GraduationCap, MessageCircle, Award, Star,
  Users, Zap, Globe, Shield, Megaphone, FileText, ArrowRight, CheckCircle,
  Gift, Plane, Ticket, Trophy,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { FadeIn } from '@/components/landing/fade-in'
import { StatsCounter } from '@/components/landing/stats-counter'
import { TestimonialsCarousel } from '@/components/landing/testimonials-carousel'
import { FaqAccordion } from '@/components/landing/faq-accordion'
import { LandingHeader } from '@/components/landing/landing-header'
import { CountdownBar } from '@/components/landing/countdown-bar'
import { CookieBanner } from '@/components/landing/cookie-banner'
import { LeadForm } from '@/components/landing/lead-form'
import { PartnersCarousel } from '@/components/landing/partners-carousel'

type BenefitCard = { icon: string; title: string; description: string }
type Stat        = { number: string; label: string }
type Step        = { title: string; description: string }
type Testimonial = { name: string; role: string; text: string; avatar_url: string; rating?: number }
type FaqEntry    = { question: string; answer: string }
type Partner     = { name: string; logo_url: string }
type Seal        = { image_url: string; alt: string }

const SECTION_KEYS = ['stats', 'partners', 'benefits', 'perks', 'steps', 'about', 'testimonials', 'faq', 'leads', 'cta'] as const
type SectionKey = typeof SECTION_KEYS[number]

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Radio, BookOpen, GraduationCap, MessageCircle, Award, Star,
  Users, Zap, Globe, Shield, Megaphone, FileText, Gift, Plane, Ticket, Trophy,
}
function BenefitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Star
  return <Icon className={className} />
}

function parse<T>(json: string, fallback: T[]): T[] {
  try { const r = JSON.parse(json); return Array.isArray(r) ? r : fallback }
  catch { return fallback }
}

function parseSectionOrder(json: string): SectionKey[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter((k): k is SectionKey => SECTION_KEYS.includes(k as SectionKey))
      const missing = SECTION_KEYS.filter(k => !valid.includes(k))
      return [...valid, ...missing]
    }
  } catch {}
  return [...SECTION_KEYS]
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url.trim()) return null
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url
  const yt1 = url.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (yt1) return `https://www.youtube.com/embed/${yt1[1]}?rel=0`
  const yt2 = url.match(/youtu\.be\/([^?&]+)/)
  if (yt2) return `https://www.youtube.com/embed/${yt2[1]}?rel=0`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-7 md:mb-10">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-2.5 max-w-xl mx-auto text-sm leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const title = s.seo_title || s.site_name || 'Universidade LV'
  const description = s.seo_description || ''
  return {
    title,
    description,
    keywords: s.seo_keywords || undefined,
    authors: s.seo_author ? [{ name: s.seo_author }] : undefined,
    robots: s.seo_robots || 'index,follow',
    alternates: s.seo_canonical_url ? { canonical: s.seo_canonical_url } : undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: s.seo_og_image ? [s.seo_og_image] : undefined,
    },
    verification: s.seo_google_verification ? { google: s.seo_google_verification } : undefined,
  }
}

export default async function LandingPage() {
  const s = await getSettings()

  const heroTitle            = s.landing_hero_title               || 'Capacitação exclusiva para agentes de viagem'
  const heroSubtitle         = s.landing_hero_subtitle            || 'Treinamentos ao vivo, cursos completos, comunidade e certificados — tudo que você precisa para se destacar.'
  const heroCtaText          = s.landing_hero_cta_text            || 'Acessar minha conta'
  const heroImage            = s.landing_hero_image_url           || ''
  const heroBadge            = s.landing_hero_badge               || ''
  const heroVideoUrl         = s.landing_hero_video_url           || ''
  const heroSecondaryCtaText = s.landing_hero_secondary_cta_text  || ''

  const benefitsSectionTitle    = s.landing_benefits_section_title    || 'O que você vai encontrar'
  const benefitsSectionSubtitle = s.landing_benefits_section_subtitle || ''
  const stepsSectionTitle       = s.landing_steps_section_title       || 'Como funciona'
  const stepsSectionSubtitle    = s.landing_steps_section_subtitle    || ''
  const testimonialsSectionTitle    = s.landing_testimonials_section_title    || ''
  const testimonialsSectionSubtitle = s.landing_testimonials_section_subtitle || ''
  const faqSectionTitle         = s.landing_faq_section_title         || 'Perguntas frequentes'

  const benefits     = parse<BenefitCard>(s.landing_benefits, []).filter(b => b.title).slice(0, 4)
  const stats        = parse<Stat>(s.landing_stats, []).filter(st => st.number && st.label).slice(0, 4)
  const steps        = parse<Step>(s.landing_steps, []).filter(st => st.title).slice(0, 3)
  const testimonials = parse<Testimonial>(s.landing_testimonials, []).filter(t => t.text)
  const faq          = parse<FaqEntry>(s.landing_faq, []).filter(f => f.question)
  type Perk = { icon: string; title: string; description: string }
  const perks        = parse<Perk>(s.landing_perks, []).filter(p => p.title)
  const perksSectionTitle    = s.landing_perks_section_title    || 'Muito além do conhecimento'
  const perksSectionSubtitle = s.landing_perks_section_subtitle || ''
  const partners     = parse<Partner>(s.landing_partners, []).filter(p => p.logo_url)
  const seals        = parse<Seal>(s.landing_seals, []).filter(sl => sl.image_url)
  const partnersSectionTitle = s.landing_partners_section_title || 'Parceiros e companhias'

  const aboutActive    = s.landing_about_active !== 'false'
  const aboutTitle     = s.landing_about_title     || 'Sobre a Litoral Verde Operadora'
  const aboutText      = s.landing_about_text      || 'A Litoral Verde Operadora de Viagens e Turismo é uma empresa especializada no desenvolvimento e capacitação de agentes de viagem em todo o Brasil. Nossa missão é colocar nas mãos dos profissionais do setor as melhores ferramentas, treinamentos práticos e materiais exclusivos para que possam se destacar no mercado e entregar experiências inesquecíveis aos seus clientes.\n\nCom a Universidade LV, levamos esse propósito a um novo nível: uma plataforma completa de aprendizado, criada por especialistas em turismo, para quem vive e respira viagens.'
  const aboutImage     = s.landing_about_image_url || ''
  const aboutChecklist = (s.landing_about_checklist || 'Empresa especializada no mercado de turismo e viagens\nTreinamentos conduzidos por especialistas do setor\nCertificados reconhecidos no mercado\nComunidade exclusiva para agentes de viagem')
    .split('\n').map(l => l.trim()).filter(Boolean)

  const ctaTitle      = s.landing_cta_title       || ''
  const ctaSubtitle   = s.landing_cta_subtitle    || ''
  const ctaButtonText = s.landing_cta_button_text || 'Acessar agora'

  const siteName = s.site_name || 'Universidade LV'
  const logoUrl  = s.logo_url  || ''

  // Countdown
  const countdownActive = s.landing_countdown_active === 'true'
  const countdownDate   = s.landing_countdown_date   || ''
  const countdownTitle  = s.landing_countdown_title  || 'Próximo treinamento ao vivo'

  // Lead form
  const leadFormActive         = s.landing_lead_form_active          === 'true'
  const leadFormTitle          = s.landing_lead_form_title           || 'Fique por dentro das novidades'
  const leadFormSubtitle       = s.landing_lead_form_subtitle        || ''
  const leadFormCtaText        = s.landing_lead_form_cta_text        || 'Quero receber novidades'
  const leadFormSuccessMessage = s.landing_lead_form_success_message || 'Obrigado! Em breve você receberá nossas novidades.'

  // LGPD
  const lgpdActive     = s.landing_lgpd_active      === 'true'
  const lgpdText       = s.landing_lgpd_text        || 'Este site utiliza cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Privacidade e com o uso de cookies essenciais.'
  const lgpdButtonText = s.landing_lgpd_button_text || 'Aceitar e continuar'
  const lgpdLinkText   = s.landing_lgpd_link_text   || ''
  const lgpdLinkUrl    = s.landing_lgpd_link_url    || ''

  const embedUrl    = getVideoEmbedUrl(heroVideoUrl)
  const directVideo = heroVideoUrl && isDirectVideo(heroVideoUrl)
  const hasVideo    = !!(embedUrl || directVideo)

  const sectionOrder = parseSectionOrder(s.landing_section_order)

  const navLabelDefaults: Record<string, string> = { benefits: 'O que oferecemos', steps: 'Como funciona', about: 'Sobre', testimonials: 'Depoimentos', faq: 'FAQ', leads: 'Cadastre-se' }
  let navLabels = { ...navLabelDefaults }
  try { navLabels = { ...navLabels, ...JSON.parse(s.landing_nav_labels) } } catch {}

  let navCustomItems: Array<{ id: string; label: string; href: string }> = []
  try {
    const parsed = JSON.parse(s.landing_nav_custom_items)
    if (Array.isArray(parsed)) navCustomItems = parsed
  } catch {}

  const navConditions: Record<string, { href: string; show: boolean }> = {
    benefits:     { href: '#beneficios',    show: benefits.length > 0 },
    steps:        { href: '#como-funciona', show: steps.length > 0 },
    about:        { href: '#sobre',         show: aboutActive && !!aboutText },
    testimonials: { href: '#depoimentos',   show: testimonials.length > 0 },
    faq:          { href: '#faq',           show: faq.length > 0 },
    leads:        { href: '#contato',       show: leadFormActive },
  }

  const defaultNavOrder = ['benefits', 'steps', 'about', 'testimonials', 'faq', 'leads']
  let navOrder = defaultNavOrder
  try {
    const parsed = JSON.parse(s.landing_nav_order)
    if (Array.isArray(parsed) && parsed.length > 0) navOrder = parsed
  } catch {}

  const navItems = navOrder.flatMap(key => {
    if (navConditions[key]) {
      if (!navConditions[key].show) return []
      return [{ label: navLabels[key] ?? key, href: navConditions[key].href }]
    }
    const custom = navCustomItems.find(c => c.id === key)
    if (!custom?.label || !custom?.href) return []
    return [{ label: custom.label, href: custom.href }]
  })

  /* ── Mapa de seções ── */
  const sectionMap: Record<SectionKey, React.ReactNode> = {

    stats: stats.length > 0 ? (
      <section key="stats" id="numeros" className="bg-green-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <StatsCounter stats={stats} />
        </div>
      </section>
    ) : null,

    partners: partners.length > 0 ? (
      <section key="partners" id="parceiros" className="py-10 px-4 sm:px-6 border-b border-border">
        <PartnersCarousel partners={partners} title={partnersSectionTitle} />
      </section>
    ) : null,

    benefits: benefits.length > 0 ? (
      <section key="benefits" id="beneficios" className="py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn><SectionHeading title={benefitsSectionTitle} subtitle={benefitsSectionSubtitle || undefined} /></FadeIn>
          <div className={`grid gap-5 ${
            benefits.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
            benefits.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
            benefits.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {benefits.map((b, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-green-300 hover:shadow-md transition-all h-full">
                  <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/15 transition-colors">
                    <BenefitIcon name={b.icon} className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm leading-snug">{b.title}</h3>
                    {b.description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{b.description}</p>}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    perks: perks.length > 0 ? (
      <section key="perks" id="diferenciais" className="py-12 md:py-16 px-4 sm:px-6 bg-green-700 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-7 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">{perksSectionTitle}</h2>
            {perksSectionSubtitle && (
              <p className="text-green-100/80 mt-2.5 max-w-2xl mx-auto text-sm leading-relaxed">{perksSectionSubtitle}</p>
            )}
          </div>
          <div className={`grid gap-5 ${
            perks.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
            perks.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
            perks.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {perks.map((p, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex flex-col gap-3 rounded-xl bg-white/10 border border-white/15 p-5 hover:bg-white/15 transition-colors h-full">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <BenefitIcon name={p.icon} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm leading-snug">{p.title}</h3>
                    {p.description && <p className="text-xs text-green-100/75 mt-1.5 leading-relaxed">{p.description}</p>}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    ) : null,

    steps: steps.length > 0 ? (
      <section key="steps" id="como-funciona" className="py-12 md:py-16 px-4 sm:px-6 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <FadeIn><SectionHeading title={stepsSectionTitle} subtitle={stepsSectionSubtitle || undefined} /></FadeIn>
          <div className={`grid gap-6 ${steps.length === 2 ? 'sm:grid-cols-2' : 'md:grid-cols-3'}`}>
            {steps.map((st, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center font-bold text-base shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{st.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{st.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn>
            <div className="text-center mt-8">
              <Link href="/login" className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-orange-600 transition-colors text-sm shadow-md min-h-[44px]">
                {heroCtaText} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    ) : null,

    about: aboutActive && aboutText ? (
      <section key="about" id="sobre" className="py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`flex flex-col gap-10 ${aboutImage ? 'lg:flex-row lg:items-center' : 'max-w-2xl mx-auto'}`}>
            <FadeIn className="flex-1 space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{aboutTitle}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aboutText}</p>
              {aboutChecklist.length > 0 && (
                <ul className="space-y-1.5">
                  {aboutChecklist.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/login" className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-orange-600 transition-colors text-sm min-h-[44px]">
                {heroCtaText} <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeIn>
            {aboutImage && (
              <FadeIn className="flex-1 max-w-lg" delay={120}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aboutImage} alt={aboutTitle} className="w-full rounded-xl object-cover aspect-video shadow-lg" />
              </FadeIn>
            )}
          </div>
        </div>
      </section>
    ) : null,

    testimonials: testimonials.length > 0 ? (
      <section key="testimonials" id="depoimentos" className="py-12 md:py-16 px-4 sm:px-6 bg-muted/40">
        <div className="max-w-4xl mx-auto">
          {(testimonialsSectionTitle || testimonialsSectionSubtitle) && (
            <FadeIn>
              <SectionHeading title={testimonialsSectionTitle} subtitle={testimonialsSectionSubtitle || undefined} />
            </FadeIn>
          )}
          <FadeIn delay={80}>
            <TestimonialsCarousel testimonials={testimonials} />
          </FadeIn>
        </div>
      </section>
    ) : null,

    faq: faq.length > 0 ? (
      <section key="faq" id="faq" className="py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <FadeIn><SectionHeading title={faqSectionTitle} /></FadeIn>
          <FadeIn delay={60}><FaqAccordion items={faq} /></FadeIn>
          <FadeIn delay={100}>
            <p className="text-center text-xs text-muted-foreground mt-6">
              Ainda tem dúvidas?{' '}
              <Link href="/login" className="text-orange-500 hover:underline font-medium">
                Entre na plataforma e fale conosco
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>
    ) : null,

    leads: leadFormActive ? (
      <LeadForm
        key="leads"
        title={leadFormTitle}
        subtitle={leadFormSubtitle}
        ctaText={leadFormCtaText}
        successMessage={leadFormSuccessMessage}
      />
    ) : null,

    cta: ctaTitle ? (
      <section key="cta" className="py-12 md:py-16 px-4 sm:px-6 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl bg-orange-500 px-6 py-10 sm:px-8 sm:py-12 md:px-14 md:py-16 text-center text-white">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
              </div>
              <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">{ctaTitle}</h2>
                {ctaSubtitle && <p className="text-white/80 text-sm max-w-md mx-auto">{ctaSubtitle}</p>}
                <div className="pt-1">
                  <Link href="/login" className="inline-flex items-center gap-2 bg-white text-orange-500 font-bold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors text-sm shadow-md min-h-[44px]">
                    {ctaButtonText} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    ) : null,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      <LandingHeader siteName={siteName} logoUrl={logoUrl} navItems={navItems} />

      {/* ══ Countdown bar (opcional, acima do hero) ══ */}
      {countdownActive && countdownDate && (
        <CountdownBar title={countdownTitle} date={countdownDate} />
      )}

      {/* ══ Hero (fixo, sempre primeiro) ══ */}
      <section className="relative overflow-hidden">
        {heroImage ? (
          <div className={`relative flex items-center ${hasVideo ? 'min-h-[420px] md:min-h-[480px]' : 'min-h-[420px] md:min-h-[520px]'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
              <div className={`flex flex-col gap-6 sm:gap-8 ${hasVideo ? 'lg:flex-row lg:items-center' : ''}`}>
                <div className="flex-1 space-y-3 sm:space-y-4 max-w-lg">
                  {heroBadge && (
                    <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white/90 text-xs font-medium px-3 py-1 rounded-full">
                      <Radio className="w-3 h-3" />{heroBadge}
                    </span>
                  )}
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 sm:px-5 sm:py-4 space-y-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white">{heroTitle}</h1>
                    <p className="text-sm md:text-base text-white/75 leading-relaxed">{heroSubtitle}</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link href="/login" className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-orange-600 transition-colors text-sm shadow-md min-h-[44px]">
                      {heroCtaText} <ArrowRight className="w-4 h-4" />
                    </Link>
                    {heroSecondaryCtaText && !hasVideo && (
                      <a href="#como-funciona" className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-medium px-5 py-3 rounded-lg hover:bg-white/20 transition-colors text-sm min-h-[44px]">
                        {heroSecondaryCtaText}
                      </a>
                    )}
                  </div>
                </div>
                {hasVideo && (
                  <div className="flex-1 max-w-xl w-full">
                    <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-video bg-black/30">
                      {embedUrl
                        ? <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Vídeo de apresentação" />
                        : <video src={heroVideoUrl} controls className="w-full h-full object-cover" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-background to-background dark:from-green-950/20 min-h-[380px] md:min-h-[440px] flex items-center">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-green-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/8 blur-2xl" />
            </div>
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-16 w-full">
              <div className={`flex flex-col gap-6 sm:gap-8 ${hasVideo ? 'lg:flex-row lg:items-center' : ''}`}>
                <div className="flex-1 space-y-4 sm:space-y-5 max-w-lg">
                  {heroBadge && (
                    <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-1 rounded-full">
                      <Radio className="w-3 h-3" />{heroBadge}
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground">{heroTitle}</h1>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{heroSubtitle}</p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <Link href="/login" className="inline-flex items-center gap-2 bg-orange-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-orange-600 transition-colors text-sm shadow-md min-h-[44px]">
                      {heroCtaText} <ArrowRight className="w-4 h-4" />
                    </Link>
                    {heroSecondaryCtaText && !hasVideo && (
                      <a href="#como-funciona" className="inline-flex items-center gap-2 border border-border text-foreground font-medium px-5 py-3 rounded-lg hover:bg-muted transition-colors text-sm min-h-[44px]">
                        {heroSecondaryCtaText}
                      </a>
                    )}
                  </div>
                </div>
                {hasVideo && (
                  <div className="flex-1 max-w-xl w-full">
                    <div className="relative rounded-xl overflow-hidden shadow-xl aspect-video bg-muted">
                      {embedUrl
                        ? <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Vídeo de apresentação" />
                        : <video src={heroVideoUrl} controls className="w-full h-full object-cover" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══ Seções ordenáveis ══ */}
      {sectionOrder.map(key => sectionMap[key])}

      {/* ══ Selos (fixos, sempre antes do footer) ══ */}
      {seals.length > 0 && (
        <section className="py-10 px-4 sm:px-6 bg-muted/30 border-t border-border">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {seals.map((sl, i) => (
              <FadeIn key={i} delay={i * 70}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.image_url} alt={sl.alt || ''} className="h-14 md:h-16 w-auto object-contain dark:brightness-0 dark:invert" />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* ══ LGPD Cookie Banner ══ */}
      {lgpdActive && <CookieBanner text={lgpdText} buttonText={lgpdButtonText} linkText={lgpdLinkText} linkUrl={lgpdLinkUrl} />}

      {/* ══ Footer ══ */}
      <footer className="border-t border-border py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-5 w-auto object-contain opacity-50" />
            )}
          </div>
          <span className="text-center leading-relaxed">
            ©2026 TODOS OS DIREITOS RESERVADOS. | L. V. OPERADORA DE VIAGENS E TURISMO LTDA | CNPJ: 10.218.043/0001-00
          </span>
          <Link href="/login" className="hover:text-foreground transition-colors font-medium shrink-0">
            Acessar plataforma →
          </Link>
        </div>
      </footer>
    </div>
  )
}
