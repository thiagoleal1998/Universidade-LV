import type React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTrainingItems, checkAndNotifyExpiredLive } from '@/app/actions/training'
import type { TrainingItem, TrainingMaterial } from '@/app/actions/training'
import { getSettings } from '@/lib/settings'
import {
  GraduationCap, ExternalLink, FileText, Play, File, Link2,
  Radio, RotateCcw, Clock, CalendarDays, MessageCircle, ChevronRight,
} from 'lucide-react'
import { LiveCountdown } from '@/components/members/live-countdown'

export const metadata = { title: 'Treinamentos' }

const TWO_HOURS = 2 * 3_600_000

const HERO_COLORS: Record<string, { from: string; via: string; to: string }> = {
  primary: { from: 'var(--primary)',  via: 'color-mix(in oklch, var(--primary) 90%, transparent)', to: 'color-mix(in oklch, var(--primary) 70%, transparent)' },
  blue:    { from: '#2563eb',         via: '#1d4ed8',  to: '#1e40af' },
  green:   { from: '#16a34a',         via: '#15803d',  to: '#166534' },
  red:     { from: '#dc2626',         via: '#b91c1c',  to: '#991b1b' },
  purple:  { from: '#9333ea',         via: '#7e22ce',  to: '#6b21a8' },
  orange:  { from: '#f97316',         via: '#ea580c',  to: '#c2410c' },
  dark:    { from: '#18181b',         via: '#09090b',  to: '#000000' },
}

function heroStyle(colorKey: string): React.CSSProperties {
  const c = HERO_COLORS[colorKey] ?? HERO_COLORS.primary
  return {
    background: `linear-gradient(135deg, ${c.from}, ${c.via}, ${c.to})`,
  }
}

function formatDate(utcStr: string) {
  return new Date(utcStr).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function MaterialIcon({ type }: { type: string }) {
  if (type === 'pdf')   return <FileText className="w-3 h-3 text-red-500 shrink-0" />
  if (type === 'video') return <Play className="w-3 h-3 text-blue-500 shrink-0" />
  if (type === 'doc')   return <File className="w-3 h-3 text-sky-500 shrink-0" />
  return <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
}

function MaterialsPanel({ materials }: { materials: TrainingMaterial[] }) {
  const sorted = [...materials].sort((a, b) => a.order_index - b.order_index)
  if (!sorted.length) return null
  return (
    <div className="border-t border-border px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materiais de apoio</p>
      <div className="flex flex-col gap-1">
        {sorted.map((mat) => (
          <a key={mat.id} href={mat.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors py-0.5">
            <MaterialIcon type={mat.type} />
            <span className="truncate">{mat.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── "Acontecendo agora" banner ──────────────────────────────────────────────

function HappeningNowBanner({ item }: { item: TrainingItem }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-red-500 bg-red-500/5 mb-8">
      <div className="bg-red-500 px-4 py-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-white">Acontecendo agora</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 p-4 md:p-6">
        {item.cover_url && (
          <Link href={`/dashboard/treinamentos/${item.id}`} className="sm:w-48 aspect-video rounded-xl overflow-hidden shrink-0 bg-muted block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          </Link>
        )}
        <div className="flex flex-col justify-center gap-2 min-w-0">
          <Link href={`/dashboard/treinamentos/${item.id}`} className="group">
            <h2 className="text-xl font-bold text-foreground leading-tight group-hover:text-red-500 transition-colors">{item.title}</h2>
          </Link>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 self-start bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Entrar agora
            </a>
            <Link
              href={`/dashboard/treinamentos/${item.id}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Próximo ao vivo (featured card) ───────────────────────────────────────

function FeaturedLiveCard({ item }: { item: TrainingItem }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-background to-background mb-8 overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <Radio className="w-4 h-4 text-red-500" />
        <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Próximo ao vivo</span>
      </div>
      <div className="flex flex-col md:flex-row gap-5 px-5 pb-5">
        <Link href={`/dashboard/treinamentos/${item.id}`} className="md:w-72 aspect-video rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center block">
          {item.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <GraduationCap className="w-16 h-16 text-primary/30" />
          )}
        </Link>
        <div className="flex flex-col justify-center gap-3 min-w-0">
          <Link href={`/dashboard/treinamentos/${item.id}`}>
            <h2 className="text-2xl font-bold text-foreground leading-tight hover:text-red-500 transition-colors">{item.title}</h2>
          </Link>
          {item.description && <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>}
          {item.live_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span className="capitalize">{formatDate(item.live_at)}</span>
            </div>
          )}
          {item.live_at && (
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-3 py-2 text-sm font-semibold w-fit">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Começa em</span>
              <LiveCountdown liveAt={item.live_at} />
            </div>
          )}
          <Link
            href={`/dashboard/treinamentos/${item.id}`}
            className="mt-1 inline-flex items-center gap-2 self-start bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <Radio className="w-4 h-4" />
            Ver treinamento
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>
      </div>
      {item.materials && item.materials.length > 0 && <MaterialsPanel materials={item.materials} />}
    </div>
  )
}

// ─── Small upcoming live ─────────────────────────────────────────────────────

function SmallLiveCard({ item }: { item: TrainingItem }) {
  return (
    <Link
      href={`/dashboard/treinamentos/${item.id}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10 transition-colors group"
    >
      <div className="w-16 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
        {item.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          : <Radio className="w-5 h-5 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate group-hover:text-red-500 transition-colors">{item.title}</p>
        {item.live_at && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <CalendarDays className="w-3 h-3" />
            <span className="capitalize">{formatDate(item.live_at)}</span>
          </div>
        )}
        {item.live_at && (
          <div className="flex items-center gap-1 text-xs text-red-500 font-medium mt-0.5">
            <Clock className="w-3 h-3" />
            <LiveCountdown liveAt={item.live_at} />
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}

// ─── Link training card ──────────────────────────────────────────────────────

function LinkCard({ item }: { item: TrainingItem }) {
  return (
    <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
      <Link href={`/dashboard/treinamentos/${item.id}`} className="flex flex-col flex-1">
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          {item.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <GraduationCap className="w-12 h-12 text-primary/40" />
          }
        </div>
        <div className="flex flex-col flex-1 p-4 gap-2">
          <p className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{item.description}</p>}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mt-1">
            <ChevronRight className="w-3.5 h-3.5" />
            Ver treinamento
          </div>
        </div>
      </Link>
      {item.materials && item.materials.length > 0 && <MaterialsPanel materials={item.materials} />}
    </div>
  )
}

// ─── Replay card ────────────────────────────────────────────────────────────

function ReplayCard({ item }: { item: TrainingItem }) {
  return (
    <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/40 hover:shadow-md transition-all duration-200 group">
      <Link href={`/dashboard/treinamentos/${item.id}`} className="flex flex-col flex-1">
        <div className="aspect-video bg-gradient-to-br from-blue-500/10 to-background flex items-center justify-center overflow-hidden relative">
          {item.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <RotateCcw className="w-12 h-12 text-blue-400/40" />
          }
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-500 text-white border border-blue-600">
            <RotateCcw className="w-2.5 h-2.5" /> Replay
          </div>
        </div>
        <div className="flex flex-col flex-1 p-4 gap-2">
          <p className="font-semibold text-foreground leading-snug group-hover:text-blue-500 transition-colors line-clamp-2">{item.title}</p>
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{item.description}</p>}
          {item.live_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3" />
              <span className="capitalize">{formatDate(item.live_at)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 mt-1">
            <ChevronRight className="w-3.5 h-3.5" />
            Assistir replay
          </div>
        </div>
      </Link>
      {item.materials && item.materials.length > 0 && <MaterialsPanel materials={item.materials} />}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TreinamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [allItemsRaw, settings] = await Promise.all([getTrainingItems(), getSettings()])
  const allItems = allItemsRaw.filter((i) => i.is_active)
  const now = Date.now()

  const happeningNow = allItems.find(
    (i) => i.type === 'live' && i.live_at &&
      new Date(i.live_at).getTime() <= now &&
      new Date(i.live_at).getTime() > now - TWO_HOURS
  ) ?? null

  const upcomingLive = allItems
    .filter((i) => i.type === 'live' && i.live_at && new Date(i.live_at).getTime() > now)
    .sort((a, b) => new Date(a.live_at!).getTime() - new Date(b.live_at!).getTime())

  const nextLive = upcomingLive[0] ?? null
  const otherUpcoming = upcomingLive.slice(1)

  const linkItems = allItems.filter((i) => i.type === 'link')

  const replayItems = allItems.filter(
    (i) => i.type === 'replay' ||
      (i.type === 'live' && i.live_at && new Date(i.live_at).getTime() <= now - TWO_HOURS)
  )

  try { await checkAndNotifyExpiredLive(allItems) } catch {}

  const hasContent = happeningNow || nextLive || linkItems.length > 0 || replayItems.length > 0

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 mb-8 text-white"
        style={heroStyle(settings.training_hero_color || 'primary')}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap className="w-8 h-8" />
            <h1 className="text-2xl md:text-3xl font-bold">
              {settings.training_hero_title || 'Treinamentos'}
            </h1>
          </div>
          {settings.training_hero_description && (
            <p className="text-white/80 max-w-xl leading-relaxed text-sm md:text-base">
              {settings.training_hero_description}
            </p>
          )}
          {settings.training_whatsapp_url && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {settings.training_whatsapp_phrase && (
                <p className="text-white/80 text-sm italic">{settings.training_whatsapp_phrase}</p>
              )}
              <a
                href={settings.training_whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors shadow-lg shadow-green-900/20 shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                {settings.training_whatsapp_cta_text || 'Entrar no grupo do WhatsApp'}
              </a>
            </div>
          )}
          {(linkItems.length > 0 || replayItems.length > 0 || upcomingLive.length > 0) && (
            <div className="flex flex-wrap gap-4 mt-5">
              {linkItems.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold">{linkItems.length}</p>
                  <p className="text-xs text-white/70">Treinamento{linkItems.length !== 1 ? 's' : ''}</p>
                </div>
              )}
              {replayItems.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold">{replayItems.length}</p>
                  <p className="text-xs text-white/70">Replay{replayItems.length !== 1 ? 's' : ''}</p>
                </div>
              )}
              {upcomingLive.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold">{upcomingLive.length}</p>
                  <p className="text-xs text-white/70">Ao vivo em breve</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-8 -bottom-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {!hasContent ? (
        <div className="text-center py-20 rounded-xl border border-dashed border-border">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum conteúdo disponível ainda.</p>
        </div>
      ) : (
        <div className="space-y-10">

          {happeningNow && <HappeningNowBanner item={happeningNow} />}

          {nextLive && <FeaturedLiveCard item={nextLive} />}

          {otherUpcoming.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400" />
                Próximas sessões ao vivo
              </h2>
              <div className="space-y-2">
                {otherUpcoming.map((item) => <SmallLiveCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {linkItems.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Treinamentos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkItems.map((item) => <LinkCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {replayItems.length > 0 && (
            <section className="border-t border-border pt-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <RotateCcw className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Replays</h2>
                  <p className="text-xs text-muted-foreground">Sessões anteriores disponíveis para assistir quando quiser</p>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">{replayItems.length} disponíve{replayItems.length !== 1 ? 'is' : 'l'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {replayItems.map((item) => <ReplayCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
