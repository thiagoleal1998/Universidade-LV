'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { updateSettings, uploadSiteLogo } from '@/app/actions/settings'
import { COLOR_PRESETS } from '@/lib/color-presets'
import type { Settings } from '@/lib/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ImagePlus, Sun, Moon, Settings2, LogIn, Presentation, Plus, Trash2, Menu, ChevronUp, ChevronDown, GraduationCap, MessageCircle, Layers, Globe, Home, Radio, BookOpen, Award, Star, Users, Zap, Shield, Megaphone, FileText, Gift, Plane, Ticket, Trophy } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

/* ── Logo upload field reutilizável ── */
function LogoField({
  label,
  description,
  url,
  onUrlChange,
  onUpload,
  isUploading,
  inputId,
  onRemove,
  previewBg = 'bg-muted',
}: {
  label: string
  description: string
  url: string
  onUrlChange: (v: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isUploading: boolean
  inputId: string
  onRemove?: () => void
  previewBg?: string
}) {
  return (
    <div>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {description && <p className="text-xs text-muted-foreground mt-0.5 mb-3">{description}</p>}
      <div className="flex items-start gap-4">
        <div
          className={cn('w-24 rounded-xl border border-border flex items-center justify-center overflow-hidden flex-shrink-0', previewBg)}
          style={{ aspectRatio: '12/5', minHeight: '40px' }}
        >
          {url ? (
            <Image src={url} alt={label || 'Logo'} width={1200} height={500} className="object-contain w-full h-full" />
          ) : (
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <Label htmlFor={inputId} className="text-xs">Upload (recomendado: 1200×500 px)</Label>
            <Input id={inputId} type="file" accept="image/*" onChange={onUpload} disabled={isUploading} className="mt-1.5" />
            {isUploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
          </div>
          <div>
            <Label className="text-xs">Ou cole uma URL</Label>
            <Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
          {url && onRemove && (
            <button type="button" onClick={onRemove} className="text-xs text-destructive hover:underline">
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Seções de marketing ── */
type SectionType = 'visual' | 'link' | 'text'
type MarketingSection = { key: string; label: string; type: SectionType }

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  visual: 'Imagens/Arquivos',
  link: 'Links',
  text: 'Textos/Scripts',
}

const DEFAULT_SECTIONS: MarketingSection[] = [
  { key: 'visual', label: 'Materiais Visuais', type: 'visual' },
  { key: 'link',   label: 'Links Úteis',        type: 'link'   },
  { key: 'email',  label: 'Templates de Email', type: 'text'   },
  { key: 'script', label: 'Scripts e Roteiros', type: 'text'   },
]

function parseSections(json: string): MarketingSection[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {}
  return DEFAULT_SECTIONS
}

/* ── Itens do menu ── */
const ALL_NAV_ITEMS = [
  { href: '/admin',                label: 'Dashboard'      },
  { href: '/admin/cursos',         label: 'Cursos'         },
  { href: '/admin/membros',        label: 'Membros'        },
  { href: '/admin/comunicados',    label: 'Comunicados'    },
  { href: '/admin/documentos',     label: 'Documentos'     },
  { href: '/admin/comunidade',     label: 'Comunidade'     },
  { href: '/admin/marketing',      label: 'Marketing'      },
  { href: '/admin/relatorios',     label: 'Relatórios'     },
  { href: '/admin/seo',            label: 'SEO'            },
  { href: '/admin/faq',            label: 'FAQ'            },
  { href: '/admin/configuracoes',  label: 'Configurações'  },
]

function parseNavOrder(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Append any new items not yet in the stored order
      const known = new Set(parsed)
      const missing = ALL_NAV_ITEMS.map((n) => n.href).filter((h) => !known.has(h))
      return [...parsed, ...missing]
    }
  } catch {}
  return ALL_NAV_ITEMS.map((n) => n.href)
}

/* ── Componente principal ── */
const TABS = [
  { id: 'landing',   label: 'Página Inicial',        icon: Home           },
  { id: 'geral',     label: 'Configurações Gerais', icon: Settings2      },
  { id: 'login',     label: 'Página de Login',       icon: LogIn          },
  { id: 'marketing', label: 'Marketing',             icon: Presentation   },
  { id: 'membro',    label: 'Área do Membro',        icon: GraduationCap  },
  { id: 'menu',      label: 'Menu Admin',            icon: Menu           },
] as const

type TabId = 'landing' | 'geral' | 'login' | 'marketing' | 'membro' | 'menu'

const LANDING_ICON_OPTIONS = [
  { value: 'Radio',         label: 'Transmissão ao vivo' },
  { value: 'BookOpen',      label: 'Livro aberto'        },
  { value: 'GraduationCap', label: 'Formatura'           },
  { value: 'MessageCircle', label: 'Comunidade'          },
  { value: 'Award',         label: 'Prêmio / Medalha'   },
  { value: 'Star',          label: 'Estrela'             },
  { value: 'Users',         label: 'Pessoas'             },
  { value: 'Zap',           label: 'Velocidade'          },
  { value: 'Globe',         label: 'Globo'               },
  { value: 'Shield',        label: 'Escudo'              },
  { value: 'Megaphone',     label: 'Marketing'           },
  { value: 'FileText',      label: 'Documento'           },
  { value: 'Gift',          label: 'Brinde / Presente'   },
  { value: 'Plane',         label: 'Avião / Viagem'      },
  { value: 'Ticket',        label: 'Ingresso / Cortesia' },
  { value: 'Trophy',        label: 'Troféu'              },
] as const

type LandingBenefit = { icon: string; title: string; description: string }
const DEFAULT_LANDING_BENEFITS: LandingBenefit[] = [
  { icon: 'Radio',         title: 'Treinamentos ao vivo',   description: 'Participe de sessões exclusivas ao vivo com nossa equipe e assista aos replays quando quiser.' },
  { icon: 'BookOpen',      title: 'Cursos completos',        description: 'Acesse módulos e aulas estruturadas no seu próprio ritmo, com progresso salvo automaticamente.' },
  { icon: 'MessageCircle', title: 'Comunidade TamoJuntoLV', description: 'Conecte-se com outros agentes de viagem e não perca nenhuma novidade.' },
  { icon: 'Award',         title: 'Certificados',            description: 'Certifique seus conhecimentos e avance na carreira como agente de viagem.' },
]
function parseLandingBenefits(json: string): LandingBenefit[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed.slice(0, 4)
  } catch {}
  return DEFAULT_LANDING_BENEFITS
}

type LandingStat = { number: string; label: string }
const DEFAULT_LANDING_STATS: LandingStat[] = [
  { number: '200+', label: 'Treinamentos realizados' },
  { number: '500+', label: 'Agentes capacitados' },
  { number: '50+',  label: 'Destinos abordados' },
  { number: '98%',  label: 'Satisfação dos alunos' },
]
function parseLandingStats(json: string): LandingStat[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed.slice(0, 4)
  } catch {}
  return DEFAULT_LANDING_STATS
}

type LandingStep = { title: string; description: string }
const DEFAULT_LANDING_STEPS: LandingStep[] = [
  { title: 'Acesse a plataforma', description: 'Faça seu login e tenha acesso imediato a todo o conteúdo.' },
  { title: 'Aprenda com especialistas', description: 'Assista a treinamentos ao vivo e acesse cursos no seu ritmo.' },
  { title: 'Certifique-se e cresça', description: 'Conclua os cursos, receba seus certificados e destaque-se.' },
]
function parseLandingSteps(json: string): LandingStep[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed.slice(0, 3)
  } catch {}
  return DEFAULT_LANDING_STEPS
}

type LandingTestimonial = { name: string; role: string; text: string; avatar_url: string; rating?: number }
const DEFAULT_LANDING_TESTIMONIALS: LandingTestimonial[] = [
  { name: 'Maria Silva', role: 'Agente de viagem — São Paulo', text: 'A Universidade LV transformou minha carreira. Os treinamentos são práticos e direto ao ponto.', avatar_url: '' },
  { name: 'João Santos', role: 'Consultor de turismo — Rio de Janeiro', text: 'O conteúdo é excelente e os certificados me ajudaram a conquistar novos clientes.', avatar_url: '' },
  { name: 'Ana Costa', role: 'Agente de viagem — Belo Horizonte', text: 'A comunidade é incrível. Aprendo com outros agentes todos os dias.', avatar_url: '' },
]
function parseLandingTestimonials(json: string): LandingTestimonial[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return DEFAULT_LANDING_TESTIMONIALS
}

type LandingPerk = { icon: string; title: string; description: string }
function parseLandingPerks(json: string): LandingPerk[] {
  try { const r = JSON.parse(json); return Array.isArray(r) ? r.slice(0, 4) : [] } catch { return [] }
}

type LandingPartner = { name: string; logo_url: string }
function parseLandingPartners(json: string): LandingPartner[] {
  try { const r = JSON.parse(json); return Array.isArray(r) ? r : [] } catch { return [] }
}

type LandingSeal = { image_url: string; alt: string }
function parseLandingSeals(json: string): LandingSeal[] {
  try { const r = JSON.parse(json); return Array.isArray(r) ? r : [] } catch { return [] }
}

type LandingFaqItem = { question: string; answer: string }
const DEFAULT_LANDING_FAQ: LandingFaqItem[] = [
  { question: 'Quem pode participar?', answer: 'A Universidade LV é exclusiva para agentes de viagem e consultores de turismo cadastrados na plataforma.' },
  { question: 'Posso acessar o conteúdo quando quiser?', answer: 'Sim! Todos os cursos e replays ficam disponíveis 24h por dia.' },
  { question: 'Os certificados têm validade?', answer: 'Os certificados têm validade indeterminada e são registrados em nome do agente.' },
  { question: 'Como funciona a comunidade TamoJuntoLV?', answer: 'É um espaço exclusivo para membros trocarem experiências, dicas e novidades do setor.' },
]
function parseLandingFaq(json: string): LandingFaqItem[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return DEFAULT_LANDING_FAQ
}

const MEMBER_SUBTABS = [
  { id: 'menu',          label: 'Menu'           },
  { id: 'home',          label: 'Home'           },
  { id: 'onboarding',    label: 'Boas-Vindas'    },
  { id: 'faq',           label: 'Assistente FAQ' },
  { id: 'treinamentos',  label: 'Treinamentos'   },
  { id: 'sidebar',       label: 'Sidebar'        },
] as const

type MemberSubTabId = typeof MEMBER_SUBTABS[number]['id']

type SidebarMagazine = { active: boolean; title: string; description: string; url: string; image_url: string; button_text: string }
type SidebarSocials = { instagram: string; facebook: string; youtube: string; whatsapp: string; twitter: string; linkedin: string }

const DEFAULT_MAGAZINE: SidebarMagazine = { active: false, title: 'LV Magazine', description: '', url: '', image_url: '', button_text: 'Ler agora' }
const DEFAULT_SOCIALS: SidebarSocials = { instagram: '', facebook: '', youtube: '', whatsapp: '', twitter: '', linkedin: '' }

function parseMagazine(json: string): SidebarMagazine {
  try { return { ...DEFAULT_MAGAZINE, ...JSON.parse(json) } } catch {}
  return DEFAULT_MAGAZINE
}
function parseSocials(json: string): SidebarSocials {
  try { return { ...DEFAULT_SOCIALS, ...JSON.parse(json) } } catch {}
  return DEFAULT_SOCIALS
}

type TamojuntoData = { active: boolean; title: string; description: string; url: string; image_url: string; button_text: string; badge: string }
const DEFAULT_TAMOJUNTO: TamojuntoData = { active: false, title: 'TamoJuntoLV', description: '', url: '', image_url: '', button_text: 'Participar', badge: 'Comunidade' }
function parseTamojunto(json: string): TamojuntoData {
  try { return { ...DEFAULT_TAMOJUNTO, ...JSON.parse(json) } } catch {}
  return DEFAULT_TAMOJUNTO
}

const DEFAULT_MEMBER_NAV_LABELS = { home: 'Início', community: 'Comunidade', documents: 'Documentos', settings: 'Configurações' }

function parseMemberNavLabels(json: string) {
  try { return { ...DEFAULT_MEMBER_NAV_LABELS, ...JSON.parse(json) } } catch {}
  return DEFAULT_MEMBER_NAV_LABELS
}

type DestaqueData = { active: boolean; title: string; description: string; url: string; cover_url: string; button_text: string }
const DEFAULT_DESTAQUE: DestaqueData = { active: false, title: '', description: '', url: '', cover_url: '', button_text: 'Acessar' }

function parseDestaque(json: string): DestaqueData {
  try { return { ...DEFAULT_DESTAQUE, ...JSON.parse(json) } } catch {}
  return DEFAULT_DESTAQUE
}

type OnboardingStep = { title: string; description: string }
const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  { title: 'Seus cursos estão aqui', description: 'Acesse "Meus Cursos" no menu para ver todo o conteúdo disponível. Seu progresso é salvo automaticamente a cada aula concluída.' },
  { title: 'Encontre qualquer conteúdo', description: 'Use o item "Buscar" no menu ou pressione Ctrl+K em qualquer página para encontrar aulas e cursos instantaneamente.' },
  { title: 'Você não está sozinho', description: 'Acesse a Comunidade para tirar dúvidas, compartilhar conquistas e interagir com outros membros.' },
]

function parseOnboardingSteps(json: string): OnboardingStep[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3)
  } catch {}
  return DEFAULT_ONBOARDING_STEPS
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [activeTab, setActiveTab] = useState<TabId>('geral')
  const [memberSubTab, setMemberSubTab] = useState<MemberSubTabId>('menu')
  const [isPending, startTransition] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const [isUploadingLogin, startUploadLogin] = useTransition()
  const [isUploadingLoginDark, startUploadLoginDark] = useTransition()
  const [isUploadingLoading, startUploadLoading] = useTransition()
  const [navOrder, setNavOrder] = useState<string[]>(() => parseNavOrder(settings.nav_order))

  // Garante que itens novos (ex: FAQ) entrem no estado mesmo após hot-reload
  useEffect(() => {
    setNavOrder((prev) => {
      const known = new Set(prev)
      const missing = ALL_NAV_ITEMS.map((n) => n.href).filter((h) => !known.has(h))
      return missing.length > 0 ? [...prev, ...missing] : prev
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [memberAreaSubtitle, setMemberAreaSubtitle] = useState(settings.member_area_subtitle)
  const [memberNavLabels, setMemberNavLabels] = useState(() => parseMemberNavLabels(settings.member_nav_labels))
  const [heroTagline, setHeroTagline] = useState(settings.dashboard_hero_tagline)
  const [destaque, setDestaque] = useState<DestaqueData>(() => parseDestaque(settings.dashboard_destaque))
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(() => parseOnboardingSteps(settings.onboarding_steps))
  const [faqAssistantName, setFaqAssistantName] = useState(settings.faq_assistant_name)
  const [faqAssistantSubtitle, setFaqAssistantSubtitle] = useState(settings.faq_assistant_subtitle)
  const [sidebarTrainingActive, setSidebarTrainingActive] = useState(settings.sidebar_training_active === 'true')
  const [sidebarTrainingLabel, setSidebarTrainingLabel] = useState(settings.sidebar_training_label || '')
  const [magazine, setMagazine] = useState<SidebarMagazine>(() => parseMagazine(settings.sidebar_magazine))
  const [sidebarMagazineLabel, setSidebarMagazineLabel] = useState(settings.sidebar_magazine_label || 'Novidades')
  const [socials, setSocials] = useState<SidebarSocials>(() => parseSocials(settings.sidebar_social_links))
  const [sidebarSocialLabel, setSidebarSocialLabel] = useState(settings.sidebar_social_label || 'Nos siga')
  const [tamojunto, setTamojunto] = useState<TamojuntoData>(() => parseTamojunto(settings.tamojunto))
  const [landingHeroTitle, setLandingHeroTitle] = useState(settings.landing_hero_title || '')
  const [landingHeroSubtitle, setLandingHeroSubtitle] = useState(settings.landing_hero_subtitle || '')
  const [landingHeroImageUrl, setLandingHeroImageUrl] = useState(settings.landing_hero_image_url || '')
  const [landingHeroCtaText, setLandingHeroCtaText] = useState(settings.landing_hero_cta_text || 'Acessar minha conta')
  const [landingAboutTitle, setLandingAboutTitle] = useState(settings.landing_about_title || '')
  const [landingAboutText, setLandingAboutText] = useState(settings.landing_about_text || '')
  const [landingAboutImageUrl, setLandingAboutImageUrl] = useState(settings.landing_about_image_url || '')
  const [landingBenefits, setLandingBenefits] = useState<LandingBenefit[]>(() => parseLandingBenefits(settings.landing_benefits))
  const [landingCtaTitle, setLandingCtaTitle] = useState(settings.landing_cta_title || '')
  const [landingCtaSubtitle, setLandingCtaSubtitle] = useState(settings.landing_cta_subtitle || '')
  const [landingCtaButtonText, setLandingCtaButtonText] = useState(settings.landing_cta_button_text || 'Acessar agora')
  const [landingStats, setLandingStats] = useState<LandingStat[]>(() => parseLandingStats(settings.landing_stats))
  const [landingSteps, setLandingSteps] = useState<LandingStep[]>(() => parseLandingSteps(settings.landing_steps))
  const [landingTestimonials, setLandingTestimonials] = useState<LandingTestimonial[]>(() => parseLandingTestimonials(settings.landing_testimonials))
  const [landingFaq, setLandingFaq] = useState<LandingFaqItem[]>(() => parseLandingFaq(settings.landing_faq))
  const [landingHeroBadge, setLandingHeroBadge] = useState(settings.landing_hero_badge || '')
  const [landingHeroVideoUrl, setLandingHeroVideoUrl] = useState(settings.landing_hero_video_url || '')
  const [landingHeroSecondaryCtaText, setLandingHeroSecondaryCtaText] = useState(settings.landing_hero_secondary_cta_text || '')
  const [landingBenefitsSectionTitle, setLandingBenefitsSectionTitle] = useState(settings.landing_benefits_section_title || '')
  const [landingBenefitsSectionSubtitle, setLandingBenefitsSectionSubtitle] = useState(settings.landing_benefits_section_subtitle || '')
  const [landingStepsSectionTitle, setLandingStepsSectionTitle] = useState(settings.landing_steps_section_title || '')
  const [landingStepsSectionSubtitle, setLandingStepsSectionSubtitle] = useState(settings.landing_steps_section_subtitle || '')
  const [landingTestimonialsSectionTitle, setLandingTestimonialsSectionTitle] = useState(settings.landing_testimonials_section_title || '')
  const [landingTestimonialsSectionSubtitle, setLandingTestimonialsSectionSubtitle] = useState(settings.landing_testimonials_section_subtitle || '')
  const [landingFaqSectionTitle, setLandingFaqSectionTitle] = useState(settings.landing_faq_section_title || '')
  const [landingAboutChecklist, setLandingAboutChecklist] = useState(settings.landing_about_checklist || '')
  const [landingNavLabels, setLandingNavLabels] = useState(() => {
    try { return { benefits: 'O que oferecemos', steps: 'Como funciona', about: 'Sobre', testimonials: 'Depoimentos', faq: 'FAQ', leads: 'Cadastre-se', ...JSON.parse(settings.landing_nav_labels) } }
    catch { return { benefits: 'O que oferecemos', steps: 'Como funciona', about: 'Sobre', testimonials: 'Depoimentos', faq: 'FAQ', leads: 'Cadastre-se' } }
  })
  const [landingPerks, setLandingPerks] = useState<LandingPerk[]>(() => parseLandingPerks(settings.landing_perks))
  const [landingPerksSectionTitle, setLandingPerksSectionTitle] = useState(settings.landing_perks_section_title || '')
  const [landingPerksSectionSubtitle, setLandingPerksSectionSubtitle] = useState(settings.landing_perks_section_subtitle || '')
  const [landingPartners, setLandingPartners] = useState<LandingPartner[]>(() => parseLandingPartners(settings.landing_partners))
  const [landingPartnersSectionTitle, setLandingPartnersSectionTitle] = useState(settings.landing_partners_section_title || '')
  const [landingSeals, setLandingSeals] = useState<LandingSeal[]>(() => parseLandingSeals(settings.landing_seals))
  const [landingSectionOrder, setLandingSectionOrder] = useState<string[]>(() => {
    const defaults = ['stats', 'partners', 'benefits', 'perks', 'steps', 'about', 'testimonials', 'faq', 'leads', 'cta']
    try {
      const parsed = JSON.parse(settings.landing_section_order)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter((k: string) => defaults.includes(k))
        const missing = defaults.filter(k => !valid.includes(k))
        return [...valid, ...missing]
      }
    } catch {}
    return defaults
  })
  const [countdownActive, setCountdownActive] = useState(settings.landing_countdown_active === 'true')
  const [countdownDate, setCountdownDate] = useState(settings.landing_countdown_date || '')
  const [countdownTitle, setCountdownTitle] = useState(settings.landing_countdown_title || 'Próximo treinamento ao vivo')
  const [leadFormActive, setLeadFormActive] = useState(settings.landing_lead_form_active === 'true')
  const [leadFormTitle, setLeadFormTitle] = useState(settings.landing_lead_form_title || '')
  const [leadFormSubtitle, setLeadFormSubtitle] = useState(settings.landing_lead_form_subtitle || '')
  const [leadFormCtaText, setLeadFormCtaText] = useState(settings.landing_lead_form_cta_text || '')
  const [leadFormSuccessMessage, setLeadFormSuccessMessage] = useState(settings.landing_lead_form_success_message || '')
  const [lgpdActive, setLgpdActive] = useState(settings.landing_lgpd_active === 'true')
  const [lgpdText, setLgpdText] = useState(settings.landing_lgpd_text || '')
  const [lgpdButtonText, setLgpdButtonText] = useState(settings.landing_lgpd_button_text || 'Aceitar e continuar')
  const [trainingHeroTitle, setTrainingHeroTitle] = useState(settings.training_hero_title)
  const [trainingHeroDescription, setTrainingHeroDescription] = useState(settings.training_hero_description)
  const [trainingHeroColor, setTrainingHeroColor] = useState(settings.training_hero_color || 'primary')
  const [trainingWhatsappUrl, setTrainingWhatsappUrl] = useState(settings.training_whatsapp_url)
  const [trainingWhatsappPhrase, setTrainingWhatsappPhrase] = useState(settings.training_whatsapp_phrase)
  const [trainingWhatsappCtaText, setTrainingWhatsappCtaText] = useState(settings.training_whatsapp_cta_text)
  const [sections, setSections] = useState<MarketingSection[]>(() => parseSections(settings.marketing_sections))
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<SectionType>('text')
  const [showAdd, setShowAdd] = useState(false)
  const [logoUrl, setLogoUrl] = useState(settings.logo_url)
  const [loginLogoUrl, setLoginLogoUrl] = useState(settings.login_logo_url)
  const [loginLogoDarkUrl, setLoginLogoDarkUrl] = useState(settings.login_logo_dark_url)
  const [loadingImageUrl, setLoadingImageUrl] = useState(settings.loading_image_url)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('logo_url', logoUrl)
    formData.set('login_logo_url', loginLogoUrl)
    formData.set('login_logo_dark_url', loginLogoDarkUrl)
    formData.set('loading_image_url', loadingImageUrl)
    formData.set('marketing_sections', JSON.stringify(sections))
    formData.set('nav_order', JSON.stringify(navOrder))
    formData.set('member_area_subtitle', memberAreaSubtitle)
    formData.set('member_nav_labels', JSON.stringify(memberNavLabels))
    formData.set('dashboard_hero_tagline', heroTagline)
    formData.set('dashboard_destaque', JSON.stringify(destaque))
    formData.set('onboarding_steps', JSON.stringify(onboardingSteps))
    formData.set('faq_assistant_name', faqAssistantName)
    formData.set('faq_assistant_subtitle', faqAssistantSubtitle)
    formData.set('sidebar_training_active', sidebarTrainingActive ? 'true' : '')
    formData.set('sidebar_training_label', sidebarTrainingLabel)
    formData.set('sidebar_magazine', JSON.stringify(magazine))
    formData.set('sidebar_magazine_label', sidebarMagazineLabel)
    formData.set('sidebar_social_links', JSON.stringify(socials))
    formData.set('sidebar_social_label', sidebarSocialLabel)
    formData.set('tamojunto', JSON.stringify(tamojunto))
    formData.set('landing_hero_title', landingHeroTitle)
    formData.set('landing_hero_subtitle', landingHeroSubtitle)
    formData.set('landing_hero_image_url', landingHeroImageUrl)
    formData.set('landing_hero_cta_text', landingHeroCtaText)
    formData.set('landing_about_title', landingAboutTitle)
    formData.set('landing_about_text', landingAboutText)
    formData.set('landing_about_image_url', landingAboutImageUrl)
    formData.set('landing_benefits', JSON.stringify(landingBenefits))
    formData.set('landing_cta_title', landingCtaTitle)
    formData.set('landing_cta_subtitle', landingCtaSubtitle)
    formData.set('landing_cta_button_text', landingCtaButtonText)
    formData.set('landing_stats', JSON.stringify(landingStats))
    formData.set('landing_steps', JSON.stringify(landingSteps))
    formData.set('landing_testimonials', JSON.stringify(landingTestimonials))
    formData.set('landing_faq', JSON.stringify(landingFaq))
    formData.set('landing_hero_badge', landingHeroBadge)
    formData.set('landing_hero_video_url', landingHeroVideoUrl)
    formData.set('landing_hero_secondary_cta_text', landingHeroSecondaryCtaText)
    formData.set('landing_benefits_section_title', landingBenefitsSectionTitle)
    formData.set('landing_benefits_section_subtitle', landingBenefitsSectionSubtitle)
    formData.set('landing_steps_section_title', landingStepsSectionTitle)
    formData.set('landing_steps_section_subtitle', landingStepsSectionSubtitle)
    formData.set('landing_testimonials_section_title', landingTestimonialsSectionTitle)
    formData.set('landing_testimonials_section_subtitle', landingTestimonialsSectionSubtitle)
    formData.set('landing_faq_section_title', landingFaqSectionTitle)
    formData.set('landing_about_checklist', landingAboutChecklist)
    formData.set('landing_nav_labels', JSON.stringify(landingNavLabels))
    formData.set('landing_perks', JSON.stringify(landingPerks))
    formData.set('landing_perks_section_title', landingPerksSectionTitle)
    formData.set('landing_perks_section_subtitle', landingPerksSectionSubtitle)
    formData.set('landing_partners', JSON.stringify(landingPartners))
    formData.set('landing_partners_section_title', landingPartnersSectionTitle)
    formData.set('landing_seals', JSON.stringify(landingSeals))
    formData.set('landing_section_order', JSON.stringify(landingSectionOrder))
    formData.set('landing_countdown_active', countdownActive ? 'true' : '')
    formData.set('landing_countdown_date', countdownDate)
    formData.set('landing_countdown_title', countdownTitle)
    formData.set('landing_lead_form_active', leadFormActive ? 'true' : '')
    formData.set('landing_lead_form_title', leadFormTitle)
    formData.set('landing_lead_form_subtitle', leadFormSubtitle)
    formData.set('landing_lead_form_cta_text', leadFormCtaText)
    formData.set('landing_lead_form_success_message', leadFormSuccessMessage)
    formData.set('landing_lgpd_active', lgpdActive ? 'true' : '')
    formData.set('landing_lgpd_text', lgpdText)
    formData.set('landing_lgpd_button_text', lgpdButtonText)
    formData.set('training_hero_title', trainingHeroTitle)
    formData.set('training_hero_description', trainingHeroDescription)
    formData.set('training_hero_color', trainingHeroColor)
    formData.set('training_whatsapp_url', trainingWhatsappUrl)
    formData.set('training_whatsapp_phrase', trainingWhatsappPhrase)
    formData.set('training_whatsapp_cta_text', trainingWhatsappCtaText)
    startTransition(async () => {
      const result = await updateSettings(formData)
      if (result?.success) toast.success('Configurações salvas!')
    })
  }

  function makeUploadHandler(
    setter: (url: string) => void,
    successMsg: string,
    uploadFn: typeof startUpload,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const fd = new FormData()
      fd.append('logo', file)
      uploadFn(async () => {
        const result = await uploadSiteLogo(fd)
        if (result?.error) toast.error(result.error)
        else if (result?.url) { setter(result.url); toast.success(successMsg) }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Tab bar ── */}
      <div className="flex border-b border-border mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Configurações Gerais ── */}
      <div className={cn('space-y-8', activeTab !== 'geral' && 'hidden')}>
        {/* Identidade */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">Identidade</h3>
          <p className="text-xs text-muted-foreground mb-4">Nome e slogan da plataforma.</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="site_name">Nome do site</Label>
              <Input id="site_name" name="site_name" defaultValue={settings.site_name} className="mt-1.5" placeholder="Universidade LV" />
            </div>
            <div>
              <Label htmlFor="site_tagline">Subtítulo</Label>
              <Input id="site_tagline" name="site_tagline" defaultValue={settings.site_tagline} className="mt-1.5" placeholder="Sua plataforma de aprendizado" />
            </div>
          </div>
        </section>

        <Separator />

        {/* Logo principal */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">Logo</h3>
          <p className="text-xs text-muted-foreground mb-4">Aparece no cabeçalho da landing page, no menu lateral e no cabeçalho da área de membros.</p>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl
                ? <Image src={logoUrl} alt="Logo" width={56} height={56} className="object-contain" />
                : <ImagePlus className="w-6 h-6 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="logo_upload" className="text-xs">Fazer upload de imagem</Label>
                <Input id="logo_upload" type="file" accept="image/*" onChange={makeUploadHandler(setLogoUrl, 'Logo atualizada!', startUpload)} disabled={isUploading} className="mt-1.5" />
                {isUploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              </div>
              <div>
                <Label className="text-xs">Ou cole uma URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Cor principal */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">Cor principal</h3>
          <p className="text-xs text-muted-foreground mb-4">Define a cor dos botões, links e elementos de destaque. Salve e recarregue para ver o efeito.</p>
          <div className="grid grid-cols-7 gap-2">
            {(Object.entries(COLOR_PRESETS) as [string, typeof COLOR_PRESETS[keyof typeof COLOR_PRESETS]][]).map(([key, preset]) => (
              <label key={key} className="cursor-pointer group">
                <input type="radio" name="primary_color" value={key} defaultChecked={settings.primary_color === key} className="sr-only" />
                <div className={cn('flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all', 'group-has-[input:checked]:border-foreground border-transparent hover:border-border')}>
                  <div className="w-7 h-7 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: preset.hex }} />
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">{preset.label}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <Separator />

        {/* Imagem de carregamento */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-1">Imagem de carregamento</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Exibida (girando) sempre que uma ação estiver em andamento. Use uma imagem PNG com fundo transparente para melhor resultado. Se não definida, usa um spinner padrão.
          </p>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {loadingImageUrl ? (
                <Image src={loadingImageUrl} alt="Loading" width={48} height={48} className="object-contain animate-spin" />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="loading_image_upload" className="text-xs">Fazer upload de imagem</Label>
                <Input
                  id="loading_image_upload"
                  type="file"
                  accept="image/*"
                  onChange={makeUploadHandler(setLoadingImageUrl, 'Imagem de carregamento atualizada!', startUploadLoading)}
                  disabled={isUploadingLoading}
                  className="mt-1.5"
                />
                {isUploadingLoading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              </div>
              <div>
                <Label className="text-xs">Ou cole uma URL</Label>
                <Input
                  value={loadingImageUrl}
                  onChange={(e) => setLoadingImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
              </div>
              {loadingImageUrl && (
                <button type="button" onClick={() => setLoadingImageUrl('')} className="text-xs text-destructive hover:underline">
                  Remover
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Aba: Página de Login ── */}
      <div className={cn('space-y-6', activeTab !== 'login' && 'hidden')}>
        <p className="text-sm text-muted-foreground">Personalize a aparência e os textos da tela de login.</p>

        {/* Textos do formulário */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Textos do formulário</h3>
          <div>
            <Label htmlFor="login_heading">Título</Label>
            <Input
              id="login_heading"
              name="login_heading"
              defaultValue={settings.login_heading}
              placeholder="Acessar minha conta"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="login_subheading">Subtítulo</Label>
            <Input
              id="login_subheading"
              name="login_subheading"
              defaultValue={settings.login_subheading}
              placeholder="Entre com seu email e senha para continuar"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="login_register_text">Texto do link de cadastro</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Link exibido abaixo do botão "Entrar".</p>
            <Input
              id="login_register_text"
              name="login_register_text"
              defaultValue={settings.login_register_text}
              placeholder="Fazer meu cadastro"
              className="mt-1.5"
            />
          </div>
        </section>

        {/* Logo claro */}
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-foreground">Logo — Modo Claro</h3>
          </div>
          <LogoField
            label=""
            description="Exibida no modo claro. Se não definida, usa a logo principal."
            url={loginLogoUrl}
            onUrlChange={setLoginLogoUrl}
            onUpload={makeUploadHandler(setLoginLogoUrl, 'Logo (claro) atualizada!', startUploadLogin)}
            isUploading={isUploadingLogin}
            inputId="login_logo_upload"
            onRemove={() => setLoginLogoUrl('')}
          />
        </div>

        {/* Logo escuro */}
        <div className="rounded-xl border border-border p-5 bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Logo — Modo Escuro</h3>
          </div>
          <LogoField
            label=""
            description="Exibida quando o usuário usa o modo escuro. Se não definida, usa a logo do modo claro."
            url={loginLogoDarkUrl}
            onUrlChange={setLoginLogoDarkUrl}
            onUpload={makeUploadHandler(setLoginLogoDarkUrl, 'Logo (escuro) atualizada!', startUploadLoginDark)}
            isUploading={isUploadingLoginDark}
            inputId="login_logo_dark_upload"
            onRemove={() => setLoginLogoDarkUrl('')}
            previewBg="bg-zinc-800"
          />
        </div>

        {/* Mensagens */}
        <div>
          <Label htmlFor="login_messages">Mensagens de boas-vindas</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
            Exibidas no painel esquerdo. Uma por linha — rodam automaticamente.
          </p>
          <Textarea
            id="login_messages"
            name="login_messages"
            defaultValue={settings.login_messages}
            placeholder={"Bem-vindo à Universidade LV\nAqui começa o seu conhecimento\nSua jornada começa agora"}
            rows={7}
            className="mt-1.5 resize-none font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Mínimo recomendado: 3 mensagens.</p>
        </div>
      </div>

      {/* ── Aba: Marketing ── */}
      <div className={cn('space-y-5', activeTab !== 'marketing' && 'hidden')}>
        <p className="text-sm text-muted-foreground">
          Gerencie as seções da área de Marketing — adicione, renomeie ou remova à vontade.
        </p>

        <div className="space-y-2">
          {sections.map((sec, i) => (
            <div key={sec.key} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
              <Input
                value={sec.label}
                onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                className="flex-1 h-8 text-sm"
                placeholder="Nome da seção"
              />
              <select
                value={sec.type}
                onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, type: e.target.value as SectionType } : s))}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shrink-0"
              >
                {(Object.entries(SECTION_TYPE_LABELS) as [SectionType, string][]).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSections((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                title="Remover seção"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {showAdd ? (
          <div className="border border-dashed rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Nova seção</p>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome da seção"
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as SectionType)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {(Object.entries(SECTION_TYPE_LABELS) as [SectionType, string][]).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                disabled={!newLabel.trim()}
                onClick={() => {
                  const key = `custom_${Date.now()}`
                  setSections((prev) => [...prev, { key, label: newLabel.trim(), type: newType }])
                  setNewLabel('')
                  setNewType('text')
                  setShowAdd(false)
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewLabel('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar seção
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Tipos: <strong>Imagens/Arquivos</strong> — grid com upload · <strong>Links</strong> — lista clicável · <strong>Textos/Scripts</strong> — cards com botão copiar
        </p>
      </div>

      {/* ── Aba: Área do Membro ── */}
      <div className={cn('space-y-6', activeTab !== 'membro' && 'hidden')}>

        {/* Sub-tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {MEMBER_SUBTABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMemberSubTab(id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                memberSubTab === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sub-aba: Menu */}
        <div className={cn('space-y-6', memberSubTab !== 'menu' && 'hidden')}>
          <section className="rounded-xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Cabeçalho do menu</h3>
            <div>
              <Label htmlFor="member_area_subtitle">Subtítulo abaixo do nome do site</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Aparece logo abaixo do nome da plataforma no sidebar dos alunos.</p>
              <Input
                id="member_area_subtitle"
                value={memberAreaSubtitle}
                onChange={(e) => setMemberAreaSubtitle(e.target.value)}
                placeholder="Área do Aluno"
                className="mt-1.5"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Rótulos do menu lateral</h3>
            <p className="text-xs text-muted-foreground">Nomes dos itens que aparecem no menu dos alunos.</p>
            {([
              { key: 'home',      label: 'Item "Início"'        },
              { key: 'community', label: 'Item "Comunidade"'    },
              { key: 'documents', label: 'Item "Documentos"'    },
              { key: 'settings',  label: 'Item "Configurações"' },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={memberNavLabels[key]}
                  onChange={(e) => setMemberNavLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1.5 h-8"
                />
              </div>
            ))}
          </section>
        </div>

        {/* Sub-aba: Home */}
        <div className={cn('space-y-6', memberSubTab !== 'home' && 'hidden')}>
          <section className="rounded-xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Hero</h3>
            <div>
              <Label htmlFor="dashboard_hero_tagline">Mensagem motivacional</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Aparece abaixo da saudação "Olá, [Nome]!" no topo da home.</p>
              <Input
                id="dashboard_hero_tagline"
                value={heroTagline}
                onChange={(e) => setHeroTagline(e.target.value)}
                placeholder="Continue de onde parou e avance no seu aprendizado."
                className="mt-1.5"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Destaque do Dia</h3>
              <button
                type="button"
                onClick={() => setDestaque((d) => ({ ...d, active: !d.active }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${destaque.active ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${destaque.active ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Card em destaque exibido na home dos alunos. Ative o toggle para que apareça.</p>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={destaque.title} onChange={(e) => setDestaque((d) => ({ ...d, title: e.target.value }))} placeholder="Aula em Destaque" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={destaque.description} onChange={(e) => setDestaque((d) => ({ ...d, description: e.target.value }))} placeholder="Não perca essa aula imperdível desta semana!" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">URL de destino</Label>
              <Input value={destaque.url} onChange={(e) => setDestaque((d) => ({ ...d, url: e.target.value }))} placeholder="/dashboard/aulas/[id] ou https://..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">URL da imagem de capa (opcional)</Label>
              <Input value={destaque.cover_url} onChange={(e) => setDestaque((d) => ({ ...d, cover_url: e.target.value }))} placeholder="https://... (deixe em branco para usar gradiente)" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Texto do botão</Label>
              <Input value={destaque.button_text} onChange={(e) => setDestaque((d) => ({ ...d, button_text: e.target.value }))} placeholder="Acessar" className="mt-1.5" />
            </div>
          </section>

          <section className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">TamoJuntoLV</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Seção de comunidade exibida na home dos alunos no lugar dos módulos avulsos.</p>
              </div>
              <button
                type="button"
                onClick={() => setTamojunto((t) => ({ ...t, active: !t.active }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tamojunto.active ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${tamojunto.active ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <Label className="text-xs">Badge</Label>
              <Input value={tamojunto.badge} onChange={(e) => setTamojunto((t) => ({ ...t, badge: e.target.value }))} placeholder="Comunidade" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={tamojunto.title} onChange={(e) => setTamojunto((t) => ({ ...t, title: e.target.value }))} placeholder="TamoJuntoLV" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={tamojunto.description} onChange={(e) => setTamojunto((t) => ({ ...t, description: e.target.value }))} placeholder="Faça parte da nossa comunidade de agentes de viagem..." rows={2} className="mt-1.5 resize-none text-sm" />
            </div>
            <div>
              <Label className="text-xs">URL de destino (grupo, link, etc.)</Label>
              <Input value={tamojunto.url} onChange={(e) => setTamojunto((t) => ({ ...t, url: e.target.value }))} placeholder="https://chat.whatsapp.com/..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">URL da imagem de capa (opcional)</Label>
              <Input value={tamojunto.image_url} onChange={(e) => setTamojunto((t) => ({ ...t, image_url: e.target.value }))} placeholder="https://..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Texto do botão</Label>
              <Input value={tamojunto.button_text} onChange={(e) => setTamojunto((t) => ({ ...t, button_text: e.target.value }))} placeholder="Participar" className="mt-1.5" />
            </div>
          </section>
        </div>

        {/* Sub-aba: Boas-Vindas */}
        <div className={cn('space-y-6', memberSubTab !== 'onboarding' && 'hidden')}>
          <section className="rounded-xl border border-border p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Mensagens de Boas-Vindas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Exibidas no modal que aparece para novos membros na primeira visita. Até 3 passos.</p>
            </div>
            {onboardingSteps.map((step, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passo {i + 1}</p>
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={step.title}
                    onChange={(e) => setOnboardingSteps((prev) => prev.map((s, j) => j === i ? { ...s, title: e.target.value } : s))}
                    placeholder={DEFAULT_ONBOARDING_STEPS[i]?.title ?? 'Título'}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={step.description}
                    onChange={(e) => setOnboardingSteps((prev) => prev.map((s, j) => j === i ? { ...s, description: e.target.value } : s))}
                    placeholder={DEFAULT_ONBOARDING_STEPS[i]?.description ?? 'Descrição'}
                    rows={3}
                    className="mt-1.5 resize-none text-sm"
                  />
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Sub-aba: Assistente FAQ */}
        <div className={cn('space-y-6', memberSubTab !== 'faq' && 'hidden')}>
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Assistente de Ajuda (FAQ)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Nome e subtítulo exibidos no cabeçalho do widget de FAQ flutuante.</p>
            </div>
            <div>
              <Label className="text-xs">Nome do assistente</Label>
              <Input
                value={faqAssistantName}
                onChange={(e) => setFaqAssistantName(e.target.value)}
                placeholder="Assistente"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Input
                value={faqAssistantSubtitle}
                onChange={(e) => setFaqAssistantSubtitle(e.target.value)}
                placeholder="Perguntas frequentes"
                className="mt-1.5"
              />
            </div>
          </section>
        </div>

        {/* Sub-aba: Treinamentos */}
        <div className={cn('space-y-6', memberSubTab !== 'treinamentos' && 'hidden')}>

          {/* Hero */}
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Banner de apresentação</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Título e texto exibidos no topo da página de Treinamentos.</p>
            </div>
            <div>
              <Label className="text-xs">Título da página</Label>
              <Input
                value={trainingHeroTitle}
                onChange={(e) => setTrainingHeroTitle(e.target.value)}
                placeholder="Treinamentos"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={trainingHeroDescription}
                onChange={(e) => setTrainingHeroDescription(e.target.value)}
                placeholder="Acesse conteúdos exclusivos, participe das sessões ao vivo..."
                rows={3}
                className="mt-1.5 resize-none text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Cor do banner</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Escolha a cor de fundo do banner de apresentação.</p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {([
                  { key: 'primary', label: 'Padrão',  bg: 'bg-primary'                   },
                  { key: 'blue',    label: 'Azul',     bg: 'bg-blue-600'                  },
                  { key: 'green',   label: 'Verde',    bg: 'bg-green-600'                 },
                  { key: 'red',     label: 'Vermelho', bg: 'bg-red-600'                   },
                  { key: 'purple',  label: 'Roxo',     bg: 'bg-purple-600'                },
                  { key: 'orange',  label: 'Laranja',  bg: 'bg-orange-500'                },
                  { key: 'dark',    label: 'Escuro',   bg: 'bg-zinc-900 border border-zinc-700' },
                ] as const).map(({ key, label, bg }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTrainingHeroColor(key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all',
                      trainingHeroColor === key ? 'border-foreground' : 'border-transparent hover:border-border'
                    )}
                  >
                    <div className={cn('w-7 h-7 rounded-full shadow-sm', bg)} />
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* WhatsApp CTA */}
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">CTA do WhatsApp</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Exibido no banner hero da página de Treinamentos. Deixe o link em branco para ocultar o botão.
                </p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Link do grupo do WhatsApp</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Cole o link de convite do grupo. Deixe vazio para não exibir o botão.</p>
              <Input
                value={trainingWhatsappUrl}
                onChange={(e) => setTrainingWhatsappUrl(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Frase de chamada</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Texto acima do botão, convida o aluno a entrar.</p>
              <Input
                value={trainingWhatsappPhrase}
                onChange={(e) => setTrainingWhatsappPhrase(e.target.value)}
                placeholder="Participe do grupo e não perca nada."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Texto do botão</Label>
              <Input
                value={trainingWhatsappCtaText}
                onChange={(e) => setTrainingWhatsappCtaText(e.target.value)}
                placeholder="Entrar no grupo do WhatsApp"
                className="mt-1.5"
              />
            </div>
            {/* Preview */}
            {(trainingWhatsappUrl || trainingWhatsappPhrase) && (
              <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pré-visualização</p>
                {trainingWhatsappPhrase && (
                  <p className="text-sm text-primary-foreground/80 italic">"{trainingWhatsappPhrase}"</p>
                )}
                {trainingWhatsappUrl && (
                  <div className="inline-flex items-center gap-2 bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {trainingWhatsappCtaText || 'Entrar no grupo do WhatsApp'}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sub-aba: Sidebar */}
        <div className={cn('space-y-6', memberSubTab !== 'sidebar' && 'hidden')}>

          {/* Próximo treinamento */}
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Próximo Treinamento</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Card com o próximo ao vivo ou treinamento ativo.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarTrainingActive((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${sidebarTrainingActive ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${sidebarTrainingActive ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground italic">O conteúdo é gerado automaticamente a partir dos treinamentos cadastrados.</p>
            <div>
              <Label className="text-xs">Título da seção</Label>
              <Input value={sidebarTrainingLabel} onChange={(e) => setSidebarTrainingLabel(e.target.value)} placeholder="Próximo ao vivo (automático se vazio)" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Deixe vazio para usar o texto automático baseado no tipo de treinamento.</p>
            </div>
          </section>

          {/* LV Magazine */}
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Card de Notícia</h3>
              <button
                type="button"
                onClick={() => setMagazine((m) => ({ ...m, active: !m.active }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${magazine.active ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${magazine.active ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <Label className="text-xs">Título da seção</Label>
              <Input value={sidebarMagazineLabel} onChange={(e) => setSidebarMagazineLabel(e.target.value)} placeholder="Novidades" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Título do card</Label>
              <Input value={magazine.title} onChange={(e) => setMagazine((m) => ({ ...m, title: e.target.value }))} placeholder="LV Magazine" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={magazine.description} onChange={(e) => setMagazine((m) => ({ ...m, description: e.target.value }))} placeholder="Fique por dentro das novidades..." rows={2} className="mt-1.5 resize-none text-sm" />
            </div>
            <div>
              <Label className="text-xs">URL de destino</Label>
              <Input value={magazine.url} onChange={(e) => setMagazine((m) => ({ ...m, url: e.target.value }))} placeholder="https://..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">URL da imagem de capa</Label>
              <Input value={magazine.image_url} onChange={(e) => setMagazine((m) => ({ ...m, image_url: e.target.value }))} placeholder="https://..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Texto do botão</Label>
              <Input value={magazine.button_text} onChange={(e) => setMagazine((m) => ({ ...m, button_text: e.target.value }))} placeholder="Ler agora" className="mt-1.5" />
            </div>
          </section>

          {/* Redes sociais */}
          <section className="rounded-xl border border-border p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Redes Sociais</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Deixe em branco para não exibir. O bloco some automaticamente se todos os campos estiverem vazios.</p>
            </div>
            <div>
              <Label className="text-xs">Título da seção</Label>
              <Input value={sidebarSocialLabel} onChange={(e) => setSidebarSocialLabel(e.target.value)} placeholder="Nos siga" className="mt-1.5" />
            </div>
            {([
              { key: 'instagram', label: 'Instagram',   placeholder: 'https://instagram.com/...'       },
              { key: 'facebook',  label: 'Facebook',    placeholder: 'https://facebook.com/...'        },
              { key: 'youtube',   label: 'YouTube',     placeholder: 'https://youtube.com/...'         },
              { key: 'whatsapp',  label: 'WhatsApp',    placeholder: 'https://chat.whatsapp.com/...'   },
              { key: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/...'               },
              { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'https://linkedin.com/...'        },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    value={socials[key]}
                    onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </section>

        </div>
      </div>

      {/* ── Aba: Menu ── */}
      <div className={cn('space-y-5', activeTab !== 'menu' && 'hidden')}>
        <p className="text-sm text-muted-foreground">
          Arraste ou use as setas para reordenar os itens do menu lateral.
        </p>
        <div className="space-y-1.5">
          {navOrder.map((href, i) => {
            const item = ALL_NAV_ITEMS.find((n) => n.href === href)
            if (!item) return null
            return (
              <div key={href} className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2.5">
                <span className="flex-1 text-sm text-foreground font-medium">{item.label}</span>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => setNavOrder((prev) => {
                    const next = [...prev]
                    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                    return next
                  })}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={i === navOrder.length - 1}
                  onClick={() => setNavOrder((prev) => {
                    const next = [...prev]
                    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                    return next
                  })}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Aba: Página Inicial (Landing) ── */}
      <div className={cn('space-y-6', activeTab !== 'landing' && 'hidden')}>

        {/* Ordem das seções */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ordem das seções</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Use as setas para reordenar as seções da página. Hero e Selos são fixos.</p>
          </div>
          {(() => {
            const SECTION_LABELS: Record<string, string> = {
              stats:        'Números em destaque',
              partners:     'Parceiros / Companhias',
              benefits:     'Benefícios',
              perks:        'Vantagens exclusivas',
              steps:        'Como funciona',
              about:        'Sobre',
              testimonials: 'Depoimentos',
              faq:          'FAQ',
              leads:        'Formulário de contato',
              cta:          'CTA Final',
            }
            return (
              <div className="space-y-1.5">
                {landingSectionOrder.map((key, i) => (
                  <div key={key} className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm text-foreground font-medium">{SECTION_LABELS[key] ?? key}</span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => setLandingSectionOrder(prev => {
                        const next = [...prev]
                        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                        return next
                      })}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      title="Mover para cima"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === landingSectionOrder.length - 1}
                      onClick={() => setLandingSectionOrder(prev => {
                        const next = [...prev]
                        ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                        return next
                      })}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}
        </section>

        {/* Hero */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Hero</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Seção principal que aparece no topo da landing page pública.</p>
          </div>
          <div>
            <Label className="text-xs">Badge / Etiqueta</Label>
            <Input value={landingHeroBadge} onChange={(e) => setLandingHeroBadge(e.target.value)} placeholder="Plataforma exclusiva para agentes de viagem" className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Texto pequeno em destaque acima do título. Deixe vazio para ocultar.</p>
          </div>
          <div>
            <Label className="text-xs">Título principal</Label>
            <Input value={landingHeroTitle} onChange={(e) => setLandingHeroTitle(e.target.value)} placeholder="Capacitação exclusiva para agentes de viagem" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo</Label>
            <Textarea value={landingHeroSubtitle} onChange={(e) => setLandingHeroSubtitle(e.target.value)} placeholder="Treinamentos ao vivo, cursos completos, comunidade e certificados..." rows={2} className="mt-1.5 resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Texto do botão principal (CTA)</Label>
            <Input value={landingHeroCtaText} onChange={(e) => setLandingHeroCtaText(e.target.value)} placeholder="Acessar minha conta" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Texto do botão secundário (opcional)</Label>
            <Input value={landingHeroSecondaryCtaText} onChange={(e) => setLandingHeroSecondaryCtaText(e.target.value)} placeholder="Como funciona" className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Aparece ao lado do botão principal. Deixe vazio para exibir apenas um botão.</p>
          </div>
          <div>
            <Label className="text-xs">Imagem de fundo</Label>
            <Input value={landingHeroImageUrl} onChange={(e) => setLandingHeroImageUrl(e.target.value)} placeholder="https://... (deixe vazio para usar gradiente)" className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">URL de imagem. Se vazio, exibe gradiente na cor principal.</p>
          </div>
          <div>
            <Label className="text-xs">URL do vídeo (opcional)</Label>
            <Input value={landingHeroVideoUrl} onChange={(e) => setLandingHeroVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Cole uma URL do YouTube, Vimeo ou vídeo direto (.mp4). Quando preenchido, o hero exibe o vídeo ao lado do texto.</p>
          </div>
        </section>

        {/* Benefícios */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Benefícios / O que você vai encontrar</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Até 4 cards destacando as funcionalidades da área de membros.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingBenefitsSectionTitle} onChange={(e) => setLandingBenefitsSectionTitle(e.target.value)} placeholder="O que você vai encontrar" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo da seção</Label>
            <Input value={landingBenefitsSectionSubtitle} onChange={(e) => setLandingBenefitsSectionSubtitle(e.target.value)} placeholder="Acesso completo a tudo que um agente de viagem precisa..." className="mt-1.5" />
          </div>
          {landingBenefits.map((b, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Card {i + 1}</p>
                <button
                  type="button"
                  onClick={() => setLandingBenefits((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Remover card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Ícone</Label>
                <select
                  value={b.icon}
                  onChange={(e) => setLandingBenefits((prev) => prev.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
                  className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {LANDING_ICON_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={b.title} onChange={(e) => setLandingBenefits((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Título do card" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={b.description} onChange={(e) => setLandingBenefits((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Breve descrição do benefício..." rows={2} className="mt-1.5 resize-none text-sm" />
              </div>
            </div>
          ))}
          {landingBenefits.length < 4 && (
            <button
              type="button"
              onClick={() => setLandingBenefits((prev) => [...prev, { icon: 'Star', title: '', description: '' }])}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar card
            </button>
          )}
        </section>

        {/* Vantagens */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Vantagens exclusivas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Seção em destaque (fundo verde) mostrando os benefícios de participar dos treinamentos. Até 4 itens.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingPerksSectionTitle} onChange={(e) => setLandingPerksSectionTitle(e.target.value)} placeholder="Muito além do conhecimento" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo da seção</Label>
            <Textarea value={landingPerksSectionSubtitle} onChange={(e) => setLandingPerksSectionSubtitle(e.target.value)} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Participar dos treinamentos é uma experiência completa..." />
          </div>
          {landingPerks.map((p, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item {i + 1}</p>
                <button type="button" onClick={() => setLandingPerks((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Ícone</Label>
                <select
                  value={p.icon}
                  onChange={(e) => setLandingPerks((prev) => prev.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
                  className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {LANDING_ICON_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={p.title} onChange={(e) => setLandingPerks((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Título da vantagem" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={p.description} onChange={(e) => setLandingPerks((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Descreva a vantagem..." />
              </div>
            </div>
          ))}
          {landingPerks.length < 4 && (
            <button type="button" onClick={() => setLandingPerks((prev) => [...prev, { icon: 'Gift', title: '', description: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              <Plus className="w-4 h-4" />Adicionar vantagem
            </button>
          )}
        </section>

        {/* Sobre */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sobre / Apresentação</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Seção de texto livre com imagem. Só aparece na landing se o campo "Texto" estiver preenchido.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingAboutTitle} onChange={(e) => setLandingAboutTitle(e.target.value)} placeholder="Sobre a Universidade LV" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Texto</Label>
            <Textarea value={landingAboutText} onChange={(e) => setLandingAboutText(e.target.value)} placeholder="Conte sobre a plataforma, missão, diferenciais..." rows={4} className="mt-1.5 resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Lista de diferenciais (um por linha)</Label>
            <Textarea value={landingAboutChecklist} onChange={(e) => setLandingAboutChecklist(e.target.value)} placeholder={"Conteúdo atualizado constantemente\nInstrutores especialistas em turismo\nCertificados reconhecidos no mercado"} rows={4} className="mt-1.5 resize-none text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Cada linha vira um item com ícone de check. Deixe vazio para ocultar.</p>
          </div>
          <div>
            <Label className="text-xs">URL da imagem lateral (opcional)</Label>
            <Input value={landingAboutImageUrl} onChange={(e) => setLandingAboutImageUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
        </section>

        {/* Navegação */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Menu de navegação</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Textos dos links no menu do header. Cada item só aparece se a seção correspondente tiver conteúdo.</p>
          </div>
          {([
            { key: 'benefits',     label: 'Benefícios / O que oferecemos' },
            { key: 'steps',        label: 'Como funciona' },
            { key: 'about',        label: 'Sobre' },
            { key: 'testimonials', label: 'Depoimentos' },
            { key: 'faq',          label: 'FAQ' },
            { key: 'leads',        label: 'Formulário de contato' },
          ] as const).map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                value={(landingNavLabels as Record<string, string>)[key] ?? ''}
                onChange={(e) => setLandingNavLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={label}
                className="mt-1.5"
              />
            </div>
          ))}
        </section>

        {/* Números / Stats */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Números em destaque</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Faixa com até 4 estatísticas (ex: "200+ Treinamentos"). Aparece logo após o hero.</p>
          </div>
          {landingStats.map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Número {i + 1}</p>
                <button type="button" onClick={() => setLandingStats((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Número</Label>
                  <Input value={s.number} onChange={(e) => setLandingStats((prev) => prev.map((x, j) => j === i ? { ...x, number: e.target.value } : x))} placeholder="200+" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs">Legenda</Label>
                  <Input value={s.label} onChange={(e) => setLandingStats((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Treinamentos realizados" className="mt-1.5" />
                </div>
              </div>
            </div>
          ))}
          {landingStats.length < 4 && (
            <button type="button" onClick={() => setLandingStats((prev) => [...prev, { number: '', label: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              <Plus className="w-4 h-4" />Adicionar número
            </button>
          )}
        </section>

        {/* Como funciona */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Como funciona</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Até 3 passos numerados explicando o fluxo da plataforma.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingStepsSectionTitle} onChange={(e) => setLandingStepsSectionTitle(e.target.value)} placeholder="Como funciona" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo da seção</Label>
            <Input value={landingStepsSectionSubtitle} onChange={(e) => setLandingStepsSectionSubtitle(e.target.value)} placeholder="Em 3 passos você já está aprendendo e evoluindo..." className="mt-1.5" />
          </div>
          {landingSteps.map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Passo {i + 1}</p>
                <button type="button" onClick={() => setLandingSteps((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={s.title} onChange={(e) => setLandingSteps((prev) => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Acesse a plataforma" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={s.description} onChange={(e) => setLandingSteps((prev) => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Descreva este passo..." />
              </div>
            </div>
          ))}
          {landingSteps.length < 3 && (
            <button type="button" onClick={() => setLandingSteps((prev) => [...prev, { title: '', description: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              <Plus className="w-4 h-4" />Adicionar passo
            </button>
          )}
        </section>

        {/* Depoimentos */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Depoimentos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Carrossel com depoimentos de agentes. Só aparece se houver ao menos 1 depoimento.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingTestimonialsSectionTitle} onChange={(e) => setLandingTestimonialsSectionTitle(e.target.value)} placeholder="Histórias reais" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo da seção</Label>
            <Input value={landingTestimonialsSectionSubtitle} onChange={(e) => setLandingTestimonialsSectionSubtitle(e.target.value)} placeholder="Agentes de viagem que transformaram sua carreira..." className="mt-1.5" />
          </div>
          {landingTestimonials.map((t, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Depoimento {i + 1}</p>
                <button type="button" onClick={() => setLandingTestimonials((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={t.name} onChange={(e) => setLandingTestimonials((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Maria Silva" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs">Cargo / Cidade</Label>
                  <Input value={t.role} onChange={(e) => setLandingTestimonials((prev) => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Agente — São Paulo" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Depoimento</Label>
                <Textarea value={t.text} onChange={(e) => setLandingTestimonials((prev) => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Escreva o depoimento..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">URL do avatar (opcional)</Label>
                  <Input value={t.avatar_url} onChange={(e) => setLandingTestimonials((prev) => prev.map((x, j) => j === i ? { ...x, avatar_url: e.target.value } : x))} placeholder="https://... (iniciais se vazio)" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs">Avaliação (estrelas, 1–5)</Label>
                  <select
                    value={t.rating ?? ''}
                    onChange={(e) => setLandingTestimonials((prev) => prev.map((x, j) => j === i ? { ...x, rating: e.target.value ? Number(e.target.value) : undefined } : x))}
                    className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sem estrelas</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLandingTestimonials((prev) => [...prev, { name: '', role: '', text: '', avatar_url: '', rating: 5 }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
            <Plus className="w-4 h-4" />Adicionar depoimento
          </button>
        </section>

        {/* FAQ */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">FAQ</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Perguntas frequentes com accordion. Só aparece se houver ao menos 1 pergunta.</p>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={landingFaqSectionTitle} onChange={(e) => setLandingFaqSectionTitle(e.target.value)} placeholder="Perguntas frequentes" className="mt-1.5" />
          </div>
          {landingFaq.map((f, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pergunta {i + 1}</p>
                <button type="button" onClick={() => setLandingFaq((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Pergunta</Label>
                <Input value={f.question} onChange={(e) => setLandingFaq((prev) => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} placeholder="Como funciona?" className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs">Resposta</Label>
                <Textarea value={f.answer} onChange={(e) => setLandingFaq((prev) => prev.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Escreva a resposta..." />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLandingFaq((prev) => [...prev, { question: '', answer: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
            <Plus className="w-4 h-4" />Adicionar pergunta
          </button>
        </section>

        {/* Parceiros */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Parceiros / Companhias</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Faixa com logos de parceiros ou companhias aéreas. Só aparece se houver ao menos 1 logo.</p>
          </div>
          <div>
            <Label className="text-xs">Título da faixa</Label>
            <Input value={landingPartnersSectionTitle} onChange={(e) => setLandingPartnersSectionTitle(e.target.value)} placeholder="Parceiros e companhias" className="mt-1.5" />
          </div>
          {landingPartners.map((p, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logo {i + 1}</p>
                <button type="button" onClick={() => setLandingPartners((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome (para acessibilidade)</Label>
                  <Input value={p.name} onChange={(e) => setLandingPartners((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Nome da empresa" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs">URL do logo</Label>
                  <Input value={p.logo_url} onChange={(e) => setLandingPartners((prev) => prev.map((x, j) => j === i ? { ...x, logo_url: e.target.value } : x))} placeholder="https://..." className="mt-1.5" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLandingPartners((prev) => [...prev, { name: '', logo_url: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
            <Plus className="w-4 h-4" />Adicionar logo
          </button>
        </section>

        {/* Selos */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Selos de credibilidade</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Imagens de selos exibidas acima do rodapé. Suba as imagens e cole as URLs aqui.</p>
          </div>
          {landingSeals.map((sl, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selo {i + 1}</p>
                <button type="button" onClick={() => setLandingSeals((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">URL da imagem</Label>
                  <Input value={sl.image_url} onChange={(e) => setLandingSeals((prev) => prev.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} placeholder="https://..." className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs">Texto alternativo</Label>
                  <Input value={sl.alt} onChange={(e) => setLandingSeals((prev) => prev.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))} placeholder="Ex: ISO 9001 Certificado" className="mt-1.5" />
                </div>
              </div>
              {sl.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sl.image_url} alt={sl.alt || 'Selo'} className="h-12 w-auto object-contain opacity-80 mt-1" />
              )}
            </div>
          ))}
          <button type="button" onClick={() => setLandingSeals((prev) => [...prev, { image_url: '', alt: '' }])} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
            <Plus className="w-4 h-4" />Adicionar selo
          </button>
        </section>

        {/* Countdown */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Countdown — Próximo treinamento</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Barra acima do hero com contagem regressiva. Ativa automaticamente quando a data estiver no futuro.</p>
            </div>
            <button
              type="button"
              onClick={() => setCountdownActive(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${countdownActive ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${countdownActive ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <Label className="text-xs">Título da barra</Label>
            <Input value={countdownTitle} onChange={e => setCountdownTitle(e.target.value)} placeholder="Próximo treinamento ao vivo" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Data e hora do evento</Label>
            <Input
              type="datetime-local"
              value={countdownDate}
              onChange={e => setCountdownDate(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">Quando a data passar, a barra some automaticamente.</p>
          </div>
        </section>

        {/* Formulário de leads */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Formulário de contato / Captação de leads</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Seção com formulário de nome + e-mail. Os contatos ficam salvos no banco de dados.</p>
            </div>
            <button
              type="button"
              onClick={() => setLeadFormActive(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${leadFormActive ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${leadFormActive ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <Label className="text-xs">Título da seção</Label>
            <Input value={leadFormTitle} onChange={e => setLeadFormTitle(e.target.value)} placeholder="Fique por dentro das novidades" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo (opcional)</Label>
            <Textarea value={leadFormSubtitle} onChange={e => setLeadFormSubtitle(e.target.value)} rows={2} className="mt-1.5 resize-none text-sm" placeholder="Cadastre-se e receba informações sobre treinamentos..." />
          </div>
          <div>
            <Label className="text-xs">Texto do botão</Label>
            <Input value={leadFormCtaText} onChange={e => setLeadFormCtaText(e.target.value)} placeholder="Quero receber novidades" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Mensagem de sucesso</Label>
            <Input value={leadFormSuccessMessage} onChange={e => setLeadFormSuccessMessage(e.target.value)} placeholder="Obrigado! Em breve você receberá nossas novidades." className="mt-1.5" />
          </div>
          <p className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/30">
            Os leads captados ficam na tabela <code className="font-mono text-[11px]">landing_leads</code> do Supabase. Execute a migração <code className="font-mono text-[11px]">20260614000000_landing_leads.sql</code> se ainda não o fez.
          </p>
        </section>

        {/* LGPD */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Banner de cookies (LGPD)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Banner fixo no rodapé informando sobre o uso de cookies. Desaparece após o visitante aceitar.</p>
            </div>
            <button
              type="button"
              onClick={() => setLgpdActive(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lgpdActive ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${lgpdActive ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div>
            <Label className="text-xs">Texto do banner</Label>
            <Textarea value={lgpdText} onChange={e => setLgpdText(e.target.value)} rows={3} className="mt-1.5 resize-none text-sm" placeholder="Este site utiliza cookies para melhorar sua experiência..." />
          </div>
          <div>
            <Label className="text-xs">Texto do botão de aceite</Label>
            <Input value={lgpdButtonText} onChange={e => setLgpdButtonText(e.target.value)} placeholder="Aceitar e continuar" className="mt-1.5" />
          </div>
        </section>

        {/* CTA Final */}
        <section className="rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">CTA Final</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Faixa de chamada no final da página. Só aparece se o Título estiver preenchido.</p>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={landingCtaTitle} onChange={(e) => setLandingCtaTitle(e.target.value)} placeholder="Pronto para começar?" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Subtítulo (opcional)</Label>
            <Input value={landingCtaSubtitle} onChange={(e) => setLandingCtaSubtitle(e.target.value)} placeholder="Junte-se a centenas de agentes de viagem..." className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs">Texto do botão</Label>
            <Input value={landingCtaButtonText} onChange={(e) => setLandingCtaButtonText(e.target.value)} placeholder="Acessar agora" className="mt-1.5" />
          </div>
        </section>

      </div>

      {/* ── Botão salvar ── */}
      <div className="pt-8 border-t border-border mt-8">
        <Button type="submit" disabled={isPending} className="min-w-36 gap-2">
          {isPending ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar configurações'}
        </Button>
      </div>
    </form>
  )
}
