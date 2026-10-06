import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSettings } from '@/lib/settings'
import { getVideoEmbed } from '@/lib/video'
import { Headphones, ExternalLink, Calendar, Clock, PlayCircle } from 'lucide-react'

export const metadata = { title: 'PodViajar' }

type Episode = {
  title: string
  description: string
  url: string
  date: string
  cover_url: string
  duration: string
}

type PodviajarData = {
  active: boolean
  title: string
  description: string
  image_url: string
  spotify_url: string
  youtube_url: string
  episodes: Episode[]
}

function parse(raw: string): PodviajarData | null {
  try {
    const p = JSON.parse(raw)
    if (!p?.active) return null
    return {
      active: true,
      title: p.title || 'PodViajar',
      description: p.description || '',
      image_url: p.image_url || '',
      spotify_url: p.spotify_url || '',
      youtube_url: p.youtube_url || '',
      episodes: Array.isArray(p.episodes) ? p.episodes : [],
    }
  } catch {
    return null
  }
}

function EpisodePlayer({ url, title }: { url: string; title: string }) {
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
    <div className={`rounded-2xl overflow-hidden border border-border bg-black ${frameClass}`}>
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

export default async function PodviajarPage({ searchParams }: { searchParams: Promise<{ ep?: string }> }) {
  const settings = await getSettings()
  const podcast = parse(settings.podviajar)

  if (!podcast) redirect('/dashboard')

  const { ep } = await searchParams
  const requested = Number(ep)
  const selectedIdx = Number.isInteger(requested) && requested >= 0 && requested < podcast.episodes.length ? requested : 0
  const selected = podcast.episodes[selectedIdx] ?? null

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">

      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
        {podcast.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={podcast.image_url}
            alt={podcast.title}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-contain bg-muted/30 shadow-md shrink-0"
          />
        ) : (
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-14 h-14 text-primary/30" />
          </div>
        )}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <Headphones className="w-3 h-3" /> Podcast
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{podcast.title}</h1>
          {podcast.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{podcast.description}</p>
          )}
          {(podcast.spotify_url || podcast.youtube_url) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {podcast.spotify_url && (
                <a
                  href={podcast.spotify_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-[#1aa34a] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Ouvir no Spotify
                </a>
              )}
              {podcast.youtube_url && (
                <a
                  href={podcast.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#FF0000] hover:bg-[#cc0000] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube Podcast
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Episódio selecionado */}
      {selected && (
        <div className="mb-10 space-y-4">
          <EpisodePlayer url={selected.url} title={selected.title} />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground leading-snug">{selected.title}</h2>
            {(selected.date || selected.duration) && (
              <div className="flex items-center gap-3 flex-wrap">
                {selected.date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                    <Calendar className="w-3 h-3" /> {selected.date}
                  </span>
                )}
                {selected.duration && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                    <Clock className="w-3 h-3" /> {selected.duration}
                  </span>
                )}
              </div>
            )}
            {selected.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Episódios */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Episódios {podcast.episodes.length > 0 && <span className="text-muted-foreground font-normal text-sm">({podcast.episodes.length})</span>}
        </h2>

        {podcast.episodes.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-2xl">
            <Headphones className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum episódio publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {podcast.episodes.map((ep, idx) => (
              <Link
                key={idx}
                href={`/dashboard/podviajar?ep=${idx}`}
                scroll={false}
                className={`group block bg-card border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all ${idx === selectedIdx ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border'}`}
              >
                {/* Imagem de capa em destaque */}
                {ep.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.cover_url}
                    alt={ep.title}
                    className="w-full block"
                  />
                ) : (
                  <div className="w-full h-32 bg-primary/5 flex items-center justify-center">
                    <Headphones className="w-10 h-10 text-primary/20" />
                  </div>
                )}

                {/* Conteúdo */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors leading-snug">
                      {ep.title}
                    </p>
                    <PlayCircle className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${idx === selectedIdx ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-primary/50'}`} />
                  </div>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{ep.description}</p>
                  )}
                  {(ep.date || ep.duration) && (
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {ep.date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                          <Calendar className="w-3 h-3" /> {ep.date}
                        </span>
                      )}
                      {ep.duration && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                          <Clock className="w-3 h-3" /> {ep.duration}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
