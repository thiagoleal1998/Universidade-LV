import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { slugify } from '@/lib/slug'
import { getVideoEmbed } from '@/lib/video'
import { ArrowLeft, Calendar, Clock, ExternalLink, PlayCircle } from 'lucide-react'

type Episode = {
  title: string
  description: string
  url: string
  date: string
  cover_url: string
  duration: string
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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/podviajar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o PodViajar
      </Link>

      <div className="space-y-6">
        <EpisodeMedia url={episode.url} title={episode.title} />

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
      </div>
    </div>
  )
}
