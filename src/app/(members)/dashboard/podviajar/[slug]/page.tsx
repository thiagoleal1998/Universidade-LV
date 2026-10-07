import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { slugify } from '@/lib/slug'
import { getVideoEmbed } from '@/lib/video'
import { TripGallery, TripVideo } from '@/components/members/trip-media-sections'
import { ArrowLeft, Calendar, Clock, ExternalLink, PlayCircle, Camera } from 'lucide-react'

type Episode = {
  title: string
  description: string
  url: string
  date: string
  cover_url: string
  duration: string
  photos?: string[]
  video_urls?: string[]
}

function EpisodeMedia({ url, title }: { url: string; title: string }) {
  const embed = getVideoEmbed(url)

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 w-full aspect-video rounded-2xl bg-primary/5 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors"
      >
        <PlayCircle className="w-5 h-5" />
        Ouvir/assistir este episódio
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
    <div className={`rounded-2xl overflow-hidden bg-black ${frameClass}`}>
      <iframe
        src={embed.embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export default async function PodviajarEpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const settings = await getSettings()

  let episodes: Episode[] = []
  try {
    const p = JSON.parse(settings.podviajar)
    if (!p?.active) redirect('/dashboard')
    episodes = Array.isArray(p.episodes) ? p.episodes : []
  } catch {
    redirect('/dashboard')
  }

  const episode = episodes.find((ep) => slugify(ep.title) === slug)
  if (!episode) notFound()

  const photos = (episode.photos ?? []).map((url, i) => ({ id: `${i}-${url}`, url, caption: '' }))
  const videoUrls = episode.video_urls ?? []
  // Mesmo racional de Famtour: só a galeria precisa do espaço lateral (fica
  // AO LADO do vídeo principal); os vídeos extras ("shorts") entram no fluxo
  // principal, abaixo da descrição — por isso só `photos` decide o layout
  // largo, não `videoUrls` como em Famtour (lá os dois dividem a coluna lateral).
  const showGallery = photos.length > 0

  return (
    <div className={`p-4 md:p-8 mx-auto ${showGallery ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <Link
        href="/dashboard/podviajar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o PodViajar
      </Link>

      <div className={showGallery ? 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8' : 'space-y-6'}>
        <div className="lg:col-start-1 lg:row-start-1">
          <EpisodeMedia url={episode.url} title={episode.title} />
        </div>

        {showGallery && (
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <TripGallery title="Bastidores" photos={photos} />
          </div>
        )}

        <div className="space-y-6 min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{episode.title}</h1>
            {(episode.date || episode.duration) && (
              <div className="flex items-center gap-3 flex-wrap">
                {episode.date && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" /> {episode.date}
                  </span>
                )}
                {episode.duration && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" /> {episode.duration}
                  </span>
                )}
              </div>
            )}
            {episode.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{episode.description}</p>
            )}
          </div>

          {videoUrls.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2 pt-4">
                <Camera className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Mais sobre esse episódio</h2>
              </div>
              <TripVideo videoUrls={videoUrls} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
