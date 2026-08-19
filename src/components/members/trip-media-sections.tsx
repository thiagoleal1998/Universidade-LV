'use client'

import { useState } from 'react'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { getVideoEmbed } from '@/lib/video'
import { PlayCircle, ExternalLink, ImageIcon, MessageSquareQuote } from 'lucide-react'

type Photo = { id: string; url: string; caption: string }
type Testimonial = { id: string; author_name: string; author_role: string; photo_url: string; content: string }

// Vídeo + galeria + depoimentos — idêntico entre a página de detalhe de
// Famtour e a de Evento (só o que decide SE esse componente renderiza muda
// entre os dois: famtour esconde tudo isso quando travado por UF, evento
// nunca esconde). Client component só por causa do estado do lightbox.
export function TripMediaSections({
  videoUrl, photos, testimonials,
}: {
  videoUrl: string | null
  photos: Photo[]
  testimonials: Testimonial[]
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const embed = getVideoEmbed(videoUrl)

  return (
    <>
      {videoUrl && (
        <div className="space-y-2">
          {embed ? (
            <div className="rounded-xl overflow-hidden border border-border aspect-video">
              <iframe
                src={embed.embedUrl}
                title="Vídeo"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              Assistir vídeo
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Galeria de fotos</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative rounded-lg overflow-hidden border border-border bg-muted/30 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || 'Foto da galeria'} className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity" />
                {photo.caption && (
                  <p className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-1 line-clamp-1 text-left">{photo.caption}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {testimonials.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Depoimentos de quem foi</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {testimonials.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs font-semibold">
                      {t.author_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.author_name}</p>
                    {t.author_role && <p className="text-xs text-muted-foreground">{t.author_role}</p>}
                  </div>
                </div>
                {t.content && <p className="text-sm text-muted-foreground leading-relaxed">&quot;{t.content}&quot;</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
