import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { getTrainingItems } from '@/app/actions/training'
import { buttonVariants } from '@/components/ui/button'
import { LiveCountdown } from '@/components/members/live-countdown'
import { WinnersCarousel } from '@/components/members/winners-carousel'
import {
  ChevronRight, BookOpen, PlayCircle, ArrowRight,
  Sparkles, Flame, Clock, Radio, GraduationCap, RotateCcw,
  MessageCircle, ExternalLink, Newspaper, Globe,
  TrendingUp, CheckCircle2, Trophy, Star, Headphones,
  MapPin, Calendar,
} from 'lucide-react'
import type { Module, Course } from '@/lib/supabase/types'
import type { TrainingItem } from '@/app/actions/training'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'

type LessonSummary = { id: string; title: string; is_published: boolean; order_index: number; module_id: string }
type ModuleWithLessons = Module & { lessons: LessonSummary[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }
type ProgressRow = { lesson_id: string; completed_at: string }

// ── Corrida de Vendas ────────────────────────────────────────────────────────
type CorridaStatus = 'proxima' | 'em_andamento' | 'finalizada'
type CorridaVencedor = { posicao: string; nome: string; agencia: string; logo_url: string }
type CorridaPreview = {
  status: CorridaStatus
  titulo: string
  destino: string
  periodo: string
  parceiro_logo_url: string
  vencedores: CorridaVencedor[]
}

function parseCorridaPreview(p: Record<string, unknown>): CorridaPreview {
  const s = p.status as string
  const rawVenc = Array.isArray(p.vencedores) ? p.vencedores : []
  return {
    status: (['proxima', 'em_andamento', 'finalizada'] as const).includes(s as CorridaStatus) ? (s as CorridaStatus) : 'em_andamento',
    titulo: typeof p.titulo === 'string' ? p.titulo : '',
    destino: typeof p.destino === 'string' ? p.destino : '',
    periodo: typeof p.periodo === 'string' ? p.periodo : '',
    parceiro_logo_url: typeof p.parceiro_logo_url === 'string' ? p.parceiro_logo_url : '',
    vencedores: rawVenc.map((v: unknown) => {
      const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
      return {
        posicao:  typeof r.posicao  === 'string' ? r.posicao  : '',
        nome:     typeof r.nome     === 'string' ? r.nome     : '',
        agencia:  typeof r.agencia  === 'string' ? r.agencia  : '',
        logo_url: typeof r.logo_url === 'string' ? r.logo_url : '',
      }
    }),
  }
}

function parseCorridasPreview(raw: string): CorridaPreview[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map((x) => parseCorridaPreview(x as Record<string, unknown>))
    if (p && typeof p === 'object') return [parseCorridaPreview(p as Record<string, unknown>)]
    return []
  } catch { return [] }
}

const TWO_HOURS = 2 * 3_600_000

function getVideoEmbed(url: string): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

function calcStreak(rows: ProgressRow[]): number {
  if (rows.length === 0) return 0
  const days = [...new Set(rows.map((r) => r.completed_at.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (days[0] !== today && days[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86_400_000
    if (diff === 1) streak++
    else break
  }
  return streak
}

// ─── Sidebar: próximo treinamento ───────────────────────────────────────────

function SidebarTrainingCard({ item }: { item: TrainingItem }) {
  const now = Date.now()
  const liveMs = item.live_at ? new Date(item.live_at).getTime() : null
  const isHappeningNow = item.type === 'live' && liveMs !== null && liveMs <= now && liveMs > now - TWO_HOURS
  const isUpcoming     = item.type === 'live' && liveMs !== null && liveMs > now
  const isReplay       = item.type === 'replay' || (item.type === 'live' && liveMs !== null && liveMs <= now - TWO_HOURS)

  const accent = isHappeningNow ? 'border-red-500/40 bg-red-500/5'
    : isUpcoming ? 'border-red-500/20 bg-red-500/5'
    : isReplay ? 'border-blue-500/20 bg-blue-500/5'
    : 'border-primary/20 bg-primary/5'

  return (
    <Link href={`/dashboard/treinamentos/${item.id}`} className={`block rounded-xl border ${accent} overflow-hidden hover:shadow-md transition-all group`}>
      {/* Cover */}
      <div className="aspect-video w-full overflow-hidden bg-muted relative">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isReplay ? <RotateCcw className="w-10 h-10 text-blue-400/40" />
              : isHappeningNow || isUpcoming ? <Radio className="w-10 h-10 text-red-400/40" />
              : <GraduationCap className="w-10 h-10 text-primary/30" />}
          </div>
        )}
        {isHappeningNow && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Ao vivo
          </div>
        )}
        {isUpcoming && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            <Radio className="w-2.5 h-2.5" /> Em breve
          </div>
        )}
        {isReplay && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            <RotateCcw className="w-2.5 h-2.5" /> Replay
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
        {isUpcoming && item.live_at && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Começa em</span>
            <LiveCountdown liveAt={item.live_at} />
          </div>
        )}
        {isHappeningNow && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
            <Radio className="w-3 h-3 animate-pulse" /> Acontecendo agora
          </div>
        )}
        <div className="flex items-center gap-1 text-xs font-semibold text-primary pt-0.5">
          Ver detalhes <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  )
}

// ─── Sidebar: magazine ───────────────────────────────────────────────────────

type SidebarMagazine = { active: boolean; title: string; description: string; url: string; image_url: string; button_text: string }

function SidebarMagazineCard({ mag }: { mag: SidebarMagazine }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {mag.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mag.image_url} alt={mag.title} className="w-full aspect-video object-cover" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <Newspaper className="w-3.5 h-3.5" />
          {mag.title || 'LV Magazine'}
        </div>
        {mag.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{mag.description}</p>
        )}
        {mag.url && (
          <a
            href={mag.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition-colors mt-1"
          >
            {mag.button_text || 'Ler agora'}
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar: podviajar ──────────────────────────────────────────────────────

type SidebarPodEpisode = { title: string; description: string; url: string; date: string; cover_url: string; duration: string }
type SidebarPodviajar = { active: boolean; title: string; description: string; image_url: string; spotify_url: string; youtube_url: string; episodes: SidebarPodEpisode[] }

function SidebarPodviajarCard({ pod }: { pod: SidebarPodviajar }) {
  const latest = pod.episodes?.[0] ?? null
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {pod.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pod.image_url} alt={pod.title} className="w-full aspect-video object-contain bg-muted/30" />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
          <Headphones className="w-3.5 h-3.5" />
          {pod.title || 'PodViajar'}
        </div>

        {latest && (
          <a
            href={latest.url || '#'}
            target={latest.url ? '_blank' : undefined}
            rel="noreferrer"
            className="group flex items-start gap-3 hover:opacity-80 transition-opacity"
          >
            {latest.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latest.cover_url} alt={latest.title} className="w-12 h-12 rounded-lg object-contain bg-muted/30 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-primary/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Último episódio</p>
              <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                {latest.title}
              </p>
            </div>
          </a>
        )}

        <Link
          href="/dashboard/podviajar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Ver todos os episódios <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Sidebar: redes sociais ──────────────────────────────────────────────────

type SidebarSocials = { instagram: string; facebook: string; youtube: string; whatsapp: string; twitter: string; linkedin: string }

const SOCIAL_CONFIG = [
  { key: 'instagram' as const, label: 'Instagram', color: 'hover:text-pink-500'   },
  { key: 'facebook'  as const, label: 'Facebook',  color: 'hover:text-blue-600'   },
  { key: 'youtube'   as const, label: 'YouTube',   color: 'hover:text-red-500'    },
  { key: 'whatsapp'  as const, label: 'WhatsApp',  color: 'hover:text-green-500'  },
  { key: 'twitter'   as const, label: 'X',         color: 'hover:text-foreground' },
  { key: 'linkedin'  as const, label: 'LinkedIn',  color: 'hover:text-blue-500'   },
]

function SocialIcon({ platform }: { platform: string }) {
  const cls = 'w-3.5 h-3.5 fill-current shrink-0'
  if (platform === 'instagram') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 110 12.324 6.162 6.162 0 010-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
  if (platform === 'facebook') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  if (platform === 'youtube') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
  if (platform === 'whatsapp') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
  if (platform === 'twitter') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
  if (platform === 'linkedin') return (
    <svg viewBox="0 0 24 24" className={cls}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
  return <Globe className="w-3.5 h-3.5" />
}

function SidebarSocialsBlock({ socials, label }: { socials: SidebarSocials; label: string }) {
  const active = SOCIAL_CONFIG.filter((s) => socials[s.key])
  if (!active.length) return null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label || 'Nos siga'}</p>
      <div className="flex flex-wrap gap-2">
        {active.map(({ key, label: platformLabel, color }) => (
          <a
            key={key}
            href={socials[key]}
            target="_blank"
            rel="noreferrer"
            title={platformLabel}
            className={`flex items-center gap-1.5 text-muted-foreground ${color} transition-colors text-xs font-medium border border-border hover:border-current rounded-lg px-3 py-1.5`}
          >
            <SocialIcon platform={key} />
            {platformLabel}
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createAdminClient()
  const { data: profileData } = await adminClient
    .from('profiles')
    .select('role, full_name')
    .eq('id', user!.id)
    .single()
  const isAdmin = profileData?.role === 'admin'
  const firstName = (profileData?.full_name ?? '').split(' ')[0] || 'Aluno'

  let accessibleCourseIds: string[] = []
  if (!isAdmin) {
    const { data: accessData } = await supabase
      .from('member_courses')
      .select('course_id')
      .eq('member_id', user!.id)
    accessibleCourseIds = (accessData ?? []).map((a) => a.course_id)
  }

  let coursesQuery = supabase
    .from('courses')
    .select('*, modules(*, lessons(id, title, is_published, order_index, module_id))')
    .eq('is_published', true)
    .order('order_index')

  if (!isAdmin && accessibleCourseIds.length > 0) {
    coursesQuery = coursesQuery.in('id', accessibleCourseIds)
  }

  const [
    { data: coursesData },
    { data: modulesData },
    { data: progressData },
    settings,
    allTrainings,
  ] = await Promise.all([
    isAdmin || accessibleCourseIds.length > 0
      ? coursesQuery
      : Promise.resolve({ data: [] }),
    supabase
      .from('modules')
      .select('*, lessons(id, title, is_published, order_index, module_id)')
      .eq('is_published', true)
      .is('course_id', null)
      .order('order_index'),
    supabase.from('member_progress').select('lesson_id, completed_at').eq('user_id', user!.id),
    getSettings(),
    getTrainingItems(),
  ])

  const courses = (coursesData ?? []) as CourseWithModules[]
  const uncategorizedModules = (modulesData ?? []) as ModuleWithLessons[]
  const progressRows = (progressData ?? []) as ProgressRow[]
  const completedSet = new Set(progressRows.map((p) => p.lesson_id))

  const allModules = [
    ...courses.flatMap((c) => c.modules ?? []),
    ...uncategorizedModules,
  ]
  const completedModuleIds = new Set(
    allModules
      .filter((mod) => {
        const published = (mod.lessons ?? []).filter((l) => l.is_published)
        return published.length > 0 && published.every((l) => completedSet.has(l.id))
      })
      .map((mod) => mod.id)
  )

  type ContinueItem = { courseId: string; courseName: string; lessonId: string; lessonTitle: string; pct: number }
  const continueItems: ContinueItem[] = courses
    .map((course) => {
      const sortedModules = (course.modules ?? []).sort((a, b) => a.order_index - b.order_index)
      const allLessons = sortedModules.flatMap((m) =>
        (m.lessons ?? []).filter((l) => l.is_published).sort((a, b) => a.order_index - b.order_index)
      )
      const total = allLessons.length
      const done = allLessons.filter((l) => completedSet.has(l.id)).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const nextLesson = allLessons.find((l) => !completedSet.has(l.id)) ?? allLessons[allLessons.length - 1]
      if (!nextLesson || total === 0) return null
      return { courseId: course.id, courseName: course.name, lessonId: nextLesson.id, lessonTitle: nextLesson.title, pct }
    })
    .filter(Boolean) as ContinueItem[]

  const totalLessons = courses.flatMap((c) => (c.modules ?? []).flatMap((m) => (m.lessons ?? []).filter((l) => l.is_published))).length
  const totalDone = completedSet.size
  const overallPct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0
  const streak = calcStreak(progressRows)
  const estimatedMinutes = totalDone * 10
  const hoursLabel = estimatedMinutes >= 60
    ? `${Math.floor(estimatedMinutes / 60)}h${estimatedMinutes % 60 > 0 ? `${estimatedMinutes % 60}m` : ''}`
    : `${estimatedMinutes}m`
  const badgeModules = allModules.filter((m) => completedModuleIds.has(m.id))

  // Destaque
  let destaque: { active: boolean; title: string; description: string; url: string; cover_url: string; button_text: string } | null = null
  try {
    const parsed = JSON.parse(settings.dashboard_destaque)
    if (parsed?.active && parsed?.title) destaque = parsed
  } catch {}
  const destaqueEmbed = destaque ? getVideoEmbed(destaque.url) : null
  const heroTagline = settings.dashboard_hero_tagline || 'Continue de onde parou e avance no seu aprendizado.'

  // Sidebar
  const sidebarTrainingActive = settings.sidebar_training_active === 'true'
  const sidebarTrainingLabel = settings.sidebar_training_label || ''
  const sidebarMagazineLabel = settings.sidebar_magazine_label || 'Novidades'
  const sidebarSocialLabel = settings.sidebar_social_label || 'Nos siga'
  let sidebarMagazine: SidebarMagazine | null = null
  try {
    const parsed = JSON.parse(settings.sidebar_magazine)
    if (parsed?.active) sidebarMagazine = parsed
  } catch {}
  let sidebarSocials: SidebarSocials = { instagram: '', facebook: '', youtube: '', whatsapp: '', twitter: '', linkedin: '' }
  try { sidebarSocials = { ...sidebarSocials, ...JSON.parse(settings.sidebar_social_links) } } catch {}

  // Corrida de Vendas
  const corridaPreviewAll = parseCorridasPreview(settings.corrida_vendas)
  const corridaPreview = corridaPreviewAll.filter(
    (c) => c.status === 'em_andamento' || c.status === 'proxima' || c.vencedores.length > 0,
  )

  // TamoJunto
  type TamojuntoSection = { active: boolean; title: string; description: string; url: string; image_url: string; button_text: string; badge: string }
  let tamojunto: TamojuntoSection | null = null
  try {
    const parsed = JSON.parse(settings.tamojunto)
    if (parsed?.active) tamojunto = parsed
  } catch {}

  // TamoJunto Winners
  type WinnersRegion = { name: string; agency1: string; value1: string; agency2: string; value2: string }
  type WinnersSection = { active: boolean; title: string; badge: string; month: string; regions: WinnersRegion[] }
  let tamojuntoWinners: WinnersSection | null = null
  try {
    const parsed = JSON.parse(settings.tamojunto_winners)
    if (parsed?.active) tamojuntoWinners = parsed
  } catch {}

  // PodViajar
  type PodEpisode = { title: string; description: string; url: string; date: string; cover_url: string; duration: string }
  type PodviajarSection = { active: boolean; title: string; description: string; image_url: string; spotify_url: string; youtube_url: string; episodes: PodEpisode[] }
  let podviajar: PodviajarSection | null = null
  try {
    const parsed = JSON.parse(settings.podviajar)
    if (parsed?.active) podviajar = parsed
  } catch {}

  // Próximo treinamento para o sidebar
  const now = Date.now()
  const activeTrainings = allTrainings.filter((i: TrainingItem) => i.is_active)
  const nextLiveTraining = activeTrainings
    .filter((i: TrainingItem) => i.type === 'live' && i.live_at && new Date(i.live_at).getTime() > now - TWO_HOURS)
    .sort((a: TrainingItem, b: TrainingItem) => new Date(a.live_at!).getTime() - new Date(b.live_at!).getTime())[0] ?? null
  const featuredTraining: TrainingItem | null = nextLiveTraining ?? activeTrainings.find((i: TrainingItem) => i.type === 'link') ?? null

  const hasSidebar = (sidebarTrainingActive && featuredTraining) || sidebarMagazine || Object.values(sidebarSocials).some(Boolean) || !!podviajar

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className={`flex flex-col gap-6 items-start ${hasSidebar ? 'xl:grid xl:grid-cols-[1fr_288px]' : ''}`}>

        {/* ── Coluna principal ── */}
        <div className="min-w-0 w-full space-y-6">

          {/* ── Greeting ── */}
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
                  <Sparkles className="w-3 h-3" /> Bem-vindo de volta
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Olá, {firstName}! 👋</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">{heroTagline}</p>
            </div>
            {badgeModules.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-foreground">{badgeModules.length} {badgeModules.length === 1 ? 'módulo concluído' : 'módulos concluídos'}</span>
              </div>
            )}
          </section>

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Aulas concluídas */}
            <div className="relative overflow-hidden rounded-2xl bg-primary/10 border border-primary/15 p-5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{totalDone}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">aulas concluídas</p>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-primary/10 blur-xl pointer-events-none" />
            </div>

            {/* Progresso geral */}
            <div className="relative overflow-hidden rounded-2xl bg-violet-500/10 border border-violet-500/15 p-5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-violet-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{overallPct}<span className="text-xl font-semibold text-muted-foreground">%</span></p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">progresso geral</p>
              {totalLessons > 0 && (
                <div className="mt-2.5 h-1.5 bg-violet-500/15 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                </div>
              )}
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-violet-500/10 blur-xl pointer-events-none" />
            </div>

            {/* Cursos ativos */}
            <div className="relative overflow-hidden rounded-2xl bg-sky-500/10 border border-sky-500/15 p-5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-sky-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{courses.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{courses.length === 1 ? 'curso ativo' : 'cursos ativos'}</p>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-500/10 blur-xl pointer-events-none" />
            </div>

            {/* Streak ou horas */}
            {streak > 0 ? (
              <div className="relative overflow-hidden rounded-2xl bg-orange-500/10 border border-orange-500/15 p-5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center mb-3">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">{streak}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{streak === 1 ? 'dia seguido' : 'dias seguidos'}</p>
                <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-orange-500/10 blur-xl pointer-events-none" />
              </div>
            ) : estimatedMinutes > 0 ? (
              <div className="relative overflow-hidden rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-foreground">{hoursLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">de estudo estimado</p>
                <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-muted/60 border border-border p-5">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Star className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">dias seguidos</p>
              </div>
            )}
          </div>

          {/* Quick link to courses */}
          <div className="flex justify-end -mt-2">
            <Link href="/dashboard/cursos" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              Ver meus cursos
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          {/* ── Destaque do Dia ── */}
          {destaque && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Destaque do Dia</h2>
              </div>
              {destaqueEmbed ? (
                <div className="rounded-2xl border border-border overflow-hidden bg-black shadow-sm">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={destaqueEmbed}
                      title={destaque.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  {(destaque.title || destaque.description) && (
                    <div className="px-5 py-4 bg-card border-t border-border">
                      <p className="font-semibold text-foreground">{destaque.title}</p>
                      {destaque.description && <p className="text-sm text-muted-foreground mt-0.5">{destaque.description}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={destaque.url || '#'}
                  className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center gap-6 hover:shadow-md hover:border-primary/40 transition-all block"
                >
                  {destaque.cover_url && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-primary/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={destaque.cover_url} alt={destaque.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-lg leading-tight">{destaque.title}</p>
                    {destaque.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{destaque.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl group-hover:bg-primary/90 transition-colors">
                    {destaque.button_text || 'Acessar'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              )}
            </section>
          )}

          {/* ── Corrida de Vendas ── */}
          {corridaPreview.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <h2 className="text-base font-semibold text-foreground">Corrida de Vendas</h2>
                </div>
                <Link href="/dashboard/comercial?tab=corrida_vendas" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver tudo <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {corridaPreview.map((corrida, idx) => {
                  const iso = detectIso(corrida.destino)
                  const st = corrida.status
                  const statusCfg = st === 'em_andamento'
                    ? { bar: 'bg-green-500', badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', icon: <PlayCircle className="w-2.5 h-2.5" />, label: 'Em andamento', fallbackBg: 'bg-green-500/10', fallbackIcon: 'text-green-500', subtab: 'em_andamento' }
                    : st === 'proxima'
                    ? { bar: 'bg-blue-500',  badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',   icon: <Clock className="w-2.5 h-2.5" />,       label: 'Próxima',       fallbackBg: 'bg-blue-500/10',  fallbackIcon: 'text-blue-500',  subtab: 'proximas' }
                    : { bar: 'bg-yellow-500', badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', icon: <Trophy className="w-2.5 h-2.5" />, label: 'Finalizada', fallbackBg: 'bg-yellow-500/10', fallbackIcon: 'text-yellow-500', subtab: 'vencedores' }

                  return (
                    <Link
                      key={idx}
                      href={`/dashboard/comercial?tab=corrida_vendas&subtab=${statusCfg.subtab}`}
                      className="group block rounded-2xl border overflow-hidden bg-card hover:shadow-md transition-all"
                    >
                      {/* Linha principal */}
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 self-stretch shrink-0 ${statusCfg.bar}`} />

                        {corrida.parceiro_logo_url ? (
                          <div className="shrink-0 flex items-center justify-center py-4 pl-1" style={{ width: 64 }}>
                            <img src={corrida.parceiro_logo_url} alt="Parceiro" className="object-contain"
                              style={{ maxHeight: 48, maxWidth: 64, width: 'auto', height: 'auto' }} />
                          </div>
                        ) : (
                          <div className={`w-14 h-14 m-3 rounded-xl flex items-center justify-center shrink-0 ${statusCfg.fallbackBg}`}>
                            <Trophy className={`w-6 h-6 ${statusCfg.fallbackIcon}`} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 py-4 pr-2">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusCfg.badge}`}>
                              {statusCfg.icon}
                              {statusCfg.label}
                            </span>
                          </div>
                          <p className="font-semibold text-foreground text-sm leading-snug truncate group-hover:text-primary transition-colors">
                            {corrida.titulo || 'Corrida de Vendas'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {corrida.destino && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {iso
                                  ? <img src={flagImgUrl(iso, '20x15')} width={16} height={12} alt="" className="rounded-sm object-contain shrink-0" />
                                  : <MapPin className="w-3 h-3 shrink-0" />}
                                {corrida.destino}
                              </span>
                            )}
                            {corrida.periodo && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {corrida.periodo}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mr-4 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>

                      {/* Vencedores */}
                      {corrida.vencedores.length > 0 && (
                        <div className="border-t border-border px-5 py-3 space-y-2">
                          {corrida.vencedores.slice(0, 3).map((v, vi) => {
                            const pos = v.posicao.trim()
                            const isGold   = /1[°º]|1\s*lugar|ouro/i.test(pos)
                            const isSilver = /2[°º]|2\s*lugar|prata/i.test(pos)
                            const isBronze = /3[°º]|3\s*lugar|bronze/i.test(pos)
                            const bc = isGold
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                              : isSilver
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                              : isBronze
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
                              : 'bg-muted text-muted-foreground border-border'
                            return (
                              <div key={vi} className="flex items-center gap-2.5">
                                {v.logo_url ? (
                                  <img src={v.logo_url} alt={v.nome} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border" />
                                ) : (
                                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${bc}`}>
                                    {vi + 1}º
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {pos && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${bc}`}>{pos}</span>}
                                    <span className="text-sm font-semibold text-foreground truncate">{v.nome}</span>
                                  </div>
                                  {v.agencia && <p className="text-xs text-muted-foreground truncate">{v.agencia}</p>}
                                </div>
                              </div>
                            )
                          })}
                          {corrida.vencedores.length > 3 && (
                            <p className="text-xs text-muted-foreground pl-9">+{corrida.vencedores.length - 3} vencedores</p>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Vencedores TamoJunto LV ── */}
          {tamojuntoWinners && (
            <section className="rounded-2xl overflow-hidden border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-yellow-400/5 to-orange-400/5">
              <div className="p-5 sm:p-6">
                {/* Cabeçalho */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-bold text-foreground">{tamojuntoWinners.title}</h2>
                  </div>
                  {tamojuntoWinners.badge && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded-full px-3 py-1">
                      {tamojuntoWinners.badge}
                    </span>
                  )}
                  {tamojuntoWinners.month && (
                    <span className="text-xs font-semibold text-muted-foreground border border-border/60 bg-background/50 rounded-full px-3 py-1">
                      {tamojuntoWinners.month}
                    </span>
                  )}
                </div>

                {/* Carrossel de regiões */}
                <WinnersCarousel
                  regions={tamojuntoWinners.regions.filter((r) => r.agency1 || r.agency2)}
                />
              </div>
            </section>
          )}

          {/* ── TamoJuntoLV ── */}
          {tamojunto && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              {tamojunto.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tamojunto.image_url} alt={tamojunto.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-6 space-y-3">
                {tamojunto.badge && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                    <MessageCircle className="w-3 h-3" />
                    {tamojunto.badge}
                  </span>
                )}
                <h2 className="text-xl font-bold text-foreground">{tamojunto.title}</h2>
                {tamojunto.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{tamojunto.description}</p>
                )}
                {tamojunto.url && (
                  <a
                    href={tamojunto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm mt-1"
                  >
                    {tamojunto.button_text || 'Participar'}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            </div>
          )}

          {courses.length === 0 && (
            <div className="text-center py-16 bg-card border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-foreground font-semibold">Nenhum conteúdo disponível ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Entre em contato com o administrador para liberar acesso.</p>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* ── Sidebar direita ── */}
        {hasSidebar && (
          <aside className="w-full xl:w-[288px] shrink-0 space-y-4 xl:sticky xl:top-20 xl:border-l xl:border-border xl:pl-6">

            {sidebarTrainingActive && featuredTraining && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                  {sidebarTrainingLabel || (nextLiveTraining ? 'Próximo ao vivo' : 'Treinamento em destaque')}
                </p>
                <SidebarTrainingCard item={featuredTraining} />
              </div>
            )}

            {podviajar && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">Podcast</p>
                <SidebarPodviajarCard pod={podviajar as SidebarPodviajar} />
              </div>
            )}

            {sidebarMagazine && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">{sidebarMagazineLabel}</p>
                <SidebarMagazineCard mag={sidebarMagazine} />
              </div>
            )}

            <SidebarSocialsBlock socials={sidebarSocials} label={sidebarSocialLabel} />

          </aside>
        )}

      </div>
    </div>
  )
}
