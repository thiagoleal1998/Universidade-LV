import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTrainingItem } from '@/app/actions/training'
import type { TrainingMaterial, TrainingRaffleWinner } from '@/app/actions/training'
import { getMyTrainingAccessContext, requestTrainingAccess } from '@/app/actions/training-access'
import { isAccessLocked } from '@/lib/access-lock'
import { RequestAccessButton } from '@/components/members/request-access-button'
import { LiveCountdown } from '@/components/members/live-countdown'
import { StudyVideoPlayer } from '@/components/members/study-video-player'
import { extractYouTubeId } from '@/lib/youtube'
import { getVideoEmbed } from '@/lib/video'
import { toRichHtml } from '@/lib/legacy-rich-text'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { detectEstadoBR, estadoFlagUrl } from '@/lib/estado-flag'
import {
  ArrowLeft, ExternalLink, FileText, Play, File, Link2,
  Radio, RotateCcw, Clock, CalendarDays, GraduationCap, Trophy,
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

// Mesmo padrão de embed já usado em Famtour/Evento (SingleVideo, em
// trip-media-sections.tsx) — não reaproveitado direto porque aquele arquivo
// é 'use client' inteiro, e aqui não precisamos de nenhuma interatividade.
function RaffleVideo({ url }: { url: string }) {
  const embed = getVideoEmbed(url)
  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        <Play className="w-4 h-4" />
        Assistir vídeo do sorteio
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    )
  }
  const frameClass = embed.type === 'instagram'
    ? 'w-full max-w-[400px] mx-auto h-[640px]'
    : embed.vertical
      ? 'w-full max-w-[340px] mx-auto aspect-[9/16]'
      : 'w-full aspect-video'
  return (
    <div className={`rounded-xl overflow-hidden border border-border bg-black/5 ${frameClass}`}>
      <iframe
        src={embed.embedUrl}
        title="Vídeo do sorteio"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function WinnerRow({ w }: { w: TrainingRaffleWinner }) {
  const estadoSigla = w.cidade_uf ? detectEstadoBR(w.cidade_uf) : null
  const flagSrc = estadoSigla
    ? estadoFlagUrl(estadoSigla)
    : (() => { const iso = w.cidade_uf ? detectIso(w.cidade_uf) : null; return iso ? flagImgUrl(iso, '20x15') : null })()

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{w.nome}</p>
        {w.agencia && <p className="text-sm text-muted-foreground">{w.agencia}</p>}
        {w.cidade_uf && (
          <span className="flex items-center gap-1.5 mt-0.5">
            {flagSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flagSrc} width={18} height={13} alt="" className="rounded-sm object-contain shrink-0" style={{ width: 18, height: 13 }} />
            )}
            <span className="text-xs text-muted-foreground">{w.cidade_uf}</span>
          </span>
        )}
        {w.premios.length > 0 && (
          <div className="mt-1.5">
            {w.premios_titulo && <p className="text-sm font-medium text-foreground">{w.premios_titulo}</p>}
            <ul className="space-y-0.5">
              {w.premios.map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="shrink-0">🎁</span> <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const item = await getTrainingItem(id)
  if (!item || !item.is_active) notFound()

  const accessCtx = await getMyTrainingAccessContext()
  const requestStatus = accessCtx.requestsByTrainingId[item.id] ?? 'none'
  const locked = isAccessLocked(item, accessCtx.uf, requestStatus)

  const now = Date.now()
  const liveMs = item.live_at ? new Date(item.live_at).getTime() : null
  const isHappeningNow = item.type === 'live' && liveMs !== null && liveMs <= now && liveMs > now - TWO_HOURS
  const isUpcoming     = item.type === 'live' && liveMs !== null && liveMs > now
  const isExpiredLive  = item.type === 'live' && liveMs !== null && liveMs <= now - TWO_HOURS
  const isReplay       = item.type === 'replay' || isExpiredLive

  // Replay de YouTube toca embutido, no lugar da capa. Qualquer outra origem
  // (Vimeo, Drive, Zoom gravado) continua caindo no link externo de sempre.
  // Locked nunca calcula o videoId — senão o conteúdo "exclusivo" tocaria
  // igual pra quem não tem acesso, o bloqueio viraria só decoração.
  const replayVideoId = !locked && isReplay && item.url ? extractYouTubeId(item.url) : null

  const materials = [...(item.materials ?? [])].sort((a, b) => a.order_index - b.order_index)
  const winners = [...(item.raffle_winners ?? [])].sort((a, b) => a.order_index - b.order_index)
  // Vídeo do sorteio ganha coluna própria ao lado da capa em telas largas —
  // mesmo padrão já usado pra galeria/vídeo de Famtour/Evento. Só entra em
  // jogo com vídeo cadastrado E não bloqueado (locked já esconde tudo atrás
  // do pedido de acesso, não faz sentido reservar a coluna nesse caso).
  const showSide = !locked && !!item.raffle_video_url

  return (
    <div className={`p-4 md:p-8 ${showSide ? 'max-w-6xl' : 'max-w-3xl'}`}>

      {/* ── Back ── */}
      <Link
        href="/dashboard/treinamentos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Treinamentos
      </Link>

      {/* Com vídeo de sorteio: ele fica AO LADO da capa em telas largas,
          ocupando a coluna direita inteira (row-span-2, numa linha `1fr`
          pra não esticar a capa). Em telas estreitas empilha: capa, vídeo,
          texto — mesma lógica já usada em Famtour/Evento. */}
      <div className={showSide ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8' : 'space-y-6'}>

      {/* ── Player do replay (substitui a capa) ── */}
      {replayVideoId ? (
        <div className="rounded-2xl overflow-hidden border border-border lg:col-start-1 lg:row-start-1">
          <StudyVideoPlayer videoId={replayVideoId} />
        </div>
      ) : (

      /* ── Cover ── */
      <div className="relative rounded-2xl overflow-hidden bg-muted lg:col-start-1 lg:row-start-1">
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
      )}

      {/* Painel do sorteio — promo + vídeo embutido, ao lado da capa */}
      {showSide && (
        <div className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 space-y-1">
            <p className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold">
              <Trophy className="w-4 h-4 shrink-0" />
              Participe dos treinamentos e concorra a sorteios
            </p>
            <p className="text-xs text-muted-foreground">Veja como foi o sorteio deste treinamento:</p>
          </div>
          <RaffleVideo url={item.raffle_video_url} />
        </div>
      )}

      {/* ── Body ── */}
      <div className="space-y-6 min-w-0 lg:col-start-1 lg:row-start-2">

        {/* Título e descrição */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{item.title}</h1>
          {item.description && (
            <div className="rich-text rich-text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: toRichHtml(item.description) }} />
          )}
        </div>

        {/* Treinamento exclusivo, sem acesso liberado — substitui TODOS os
            CTAs abaixo (nenhum vaza URL/vídeo/link real pra quem não tem
            acesso, aprovado ou por UF). */}
        {locked && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <RequestAccessButton onRequest={requestTrainingAccess.bind(null, item.id)} exclusiveUfs={item.exclusive_ufs} status={requestStatus} />
          </div>
        )}

        {/* Acontecendo agora */}
        {!locked && isHappeningNow && (
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
        {!locked && isUpcoming && item.live_at && (
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

        {/* Replay — com o vídeo tocando acima, sobra só a data (quando existe).
            Sem player embutido, cai no cartão com o link externo de sempre. */}
        {!locked && isReplay && (replayVideoId ? (
          isExpiredLive && item.live_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-4 h-4 shrink-0 text-blue-400" />
              <span className="capitalize">Realizado em {formatDate(item.live_at)}</span>
            </div>
          )
        ) : (
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
        ))}

        {/* Treinamento (link) */}
        {!locked && item.type === 'link' && item.url && (
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

        {/* Vencedores do sorteio — também fica atrás do bloqueio, mesmo
            motivo dos materiais. O vídeo (quando há) já foi pro painel
            lateral acima (showSide); aqui só sobra a lista de vencedores,
            independente de ter vídeo ou não. */}
        {!locked && winners.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-yellow-500/5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
              <p className="text-sm font-semibold text-foreground">
                {winners.length === 1 ? 'Vencedor do sorteio' : 'Vencedores do sorteio'}
              </p>
            </div>
            <div className="divide-y divide-border">
              {winners.map((w) => <WinnerRow key={w.id} w={w} />)}
            </div>
          </div>
        )}

        {/* Materiais de apoio — também fica atrás do bloqueio: são parte do
            conteúdo exclusivo, não algo à parte. */}
        {!locked && materials.length > 0 && (
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
    </div>
  )
}
