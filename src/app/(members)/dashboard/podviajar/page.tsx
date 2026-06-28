import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import { Headphones, ExternalLink, Calendar, Clock } from 'lucide-react'

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
  apple_url: string
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
      apple_url: p.apple_url || '',
      episodes: Array.isArray(p.episodes) ? p.episodes : [],
    }
  } catch {
    return null
  }
}

export default async function PodviajarPage() {
  const settings = await getSettings()
  const podcast = parse(settings.podviajar)

  if (!podcast) redirect('/dashboard')

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
            <p className="text-sm text-muted-foreground leading-relaxed">{podcast.description}</p>
          )}
          {(podcast.spotify_url || podcast.apple_url) && (
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
              {podcast.apple_url && (
                <a
                  href={podcast.apple_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-foreground hover:bg-foreground/80 text-background text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm-.534 3.6c-1.536.138-2.88.918-3.762 2.106-.498.672-.792 1.44-.882 2.238-.018.192-.024.378-.024.564 0 1.038.3 2.01.846 2.82.114.162.228.318.348.468l-.498 2.976c-.06.354.216.654.57.66h.018c.186 0 .36-.09.474-.24l1.806-2.394c.372.108.762.168 1.164.168 2.382 0 4.314-1.932 4.314-4.314S13.878 6 11.466 6h.534-.534zm.534 1.2c1.716 0 3.114 1.398 3.114 3.114S13.716 13.8 12 13.8s-3.114-1.398-3.114-3.114S10.284 7.2 12 7.2z"/>
                  </svg>
                  Apple Podcasts
                </a>
              )}
            </div>
          )}
        </div>
      </div>

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
          <div className="space-y-3">
            {podcast.episodes.map((ep, idx) => (
              <a
                key={idx}
                href={ep.url || '#'}
                target={ep.url ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex items-start gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {ep.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.cover_url}
                    alt={ep.title}
                    className="w-16 h-16 rounded-xl object-contain bg-muted/30 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Headphones className="w-7 h-7 text-primary/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {ep.title}
                  </p>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{ep.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
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
                </div>
                {ep.url && (
                  <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0 mt-0.5" />
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
