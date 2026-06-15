import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTrainingItem } from '@/app/actions/training'
import type { TrainingMaterial } from '@/app/actions/training'
import { LiveCountdown } from '@/components/members/live-countdown'
import {
  ArrowLeft, ExternalLink, FileText, Play, File, Link2,
  Radio, RotateCcw, Clock, CalendarDays, GraduationCap,
} from 'lucide-react'

const TWO_HOURS = 2 * 3_600_000

function formatDate(utcStr: string) {
  return new Date(utcStr).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function MaterialIcon({ type }: { type: string }) {
  if (type === 'pdf')   return <FileText className="w-4 h-4 text-red-500 shrink-0" />
  if (type === 'video') return <Play className="w-4 h-4 text-blue-500 shrink-0" />
  if (type === 'doc')   return <File className="w-4 h-4 text-sky-500 shrink-0" />
  return <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const item = await getTrainingItem(id)
  if (!item || !item.is_active) notFound()

  const now = Date.now()
  const liveMs = item.live_at ? new Date(item.live_at).getTime() : null
  const isHappeningNow = item.type === 'live' && liveMs !== null && liveMs <= now && liveMs > now - TWO_HOURS
  const isUpcoming     = item.type === 'live' && liveMs !== null && liveMs > now
  const isExpiredLive  = item.type === 'live' && liveMs !== null && liveMs <= now - TWO_HOURS
  const isReplay       = item.type === 'replay' || isExpiredLive

  const materials = [...(item.materials ?? [])].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="p-4 md:p-8 max-w-3xl">

      {/* ── Back ── */}
      <Link
        href="/dashboard/treinamentos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Treinamentos
      </Link>

      {/* ── Cover ── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-muted">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_url}
            alt={item.title}
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className={`w-full aspect-video flex items-center justify-center ${
            isReplay            ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5'
            : isHappeningNow || isUpcoming ? 'bg-gradient-to-br from-red-500/20 to-red-500/5'
            : 'bg-gradient-to-br from-primary/20 to-primary/5'
          }`}>
            {isReplay
              ? <RotateCcw className="w-20 h-20 text-blue-400/30" />
              : isHappeningNow || isUpcoming
              ? <Radio className="w-20 h-20 text-red-400/30" />
              : <GraduationCap className="w-20 h-20 text-primary/20" />
            }
          </div>
        )}

        {isHappeningNow && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Ao vivo agora
          </div>
        )}
        {isReplay && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
            <RotateCcw className="w-3 h-3" />
            Replay
          </div>
        )}
        {isUpcoming && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
            <Radio className="w-3 h-3" />
            Em breve
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="space-y-6">

        {/* Título e descrição */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{item.title}</h1>
          {item.description && (
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Acontecendo agora */}
        {isHappeningNow && (
          <div className="rounded-xl border-2 border-red-500 bg-red-500/5 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-500 font-semibold">
              <Radio className="w-4 h-4 animate-pulse" />
              Esta sessão está acontecendo agora!
            </div>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Radio className="w-4 h-4" />
                Entrar na sessão ao vivo
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}
          </div>
        )}

        {/* Ao vivo agendado */}
        {isUpcoming && item.live_at && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4 shrink-0 text-red-400" />
              <span className="capitalize font-medium">{formatDate(item.live_at)}</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-4 py-2.5 font-semibold w-fit">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Começa em</span>
              <LiveCountdown liveAt={item.live_at} />
            </div>
            {item.url && (
              <div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  Confirmar presença
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Replay */}
        {isReplay && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4">
            {isExpiredLive && item.live_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4 shrink-0 text-blue-400" />
                <span className="capitalize">Realizado em {formatDate(item.live_at)}</span>
              </div>
            )}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" />
                Assistir replay
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground italic">Link do replay em breve.</p>
            )}
          </div>
        )}

        {/* Treinamento (link) */}
        {item.type === 'link' && item.url && (
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              Acessar treinamento
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        )}

        {/* Materiais de apoio */}
        {materials.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Materiais de apoio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {materials.length} item{materials.length !== 1 ? 'ns' : ''} disponíve{materials.length !== 1 ? 'is' : 'l'}
                </p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {materials.map((mat: TrainingMaterial) => (
                <a
                  key={mat.id}
                  href={mat.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors group"
                >
                  <MaterialIcon type={mat.type} />
                  <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
                    {mat.title}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
