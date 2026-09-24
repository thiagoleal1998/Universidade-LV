'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getVideoEmbed } from '@/lib/video'
import { PlayCircle, ExternalLink, ImageIcon, MessageSquareQuote, ChevronLeft, ChevronRight } from 'lucide-react'

type Photo = { id: string; url: string; caption: string }
type Testimonial = { id: string; author_name: string; author_role: string; photo_url: string; content: string }

export function TripVideo({ videoUrl, className }: { videoUrl: string | null; className?: string }) {
  const embed = getVideoEmbed(videoUrl)
  if (!videoUrl) return null

  if (!embed) {
    return (
      <div className={className}>
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
      </div>
    )
  }

  // Shorts/Reels são retrato: proporção 9:16 com largura limitada (senão a
  // caixa ficaria altíssima). O embed do Instagram traz cabeçalho/legenda
  // dentro do próprio iframe, então ganha um pouco mais de altura.
  const frameClass = embed.type === 'instagram'
    ? 'w-full max-w-[400px] mx-auto h-[640px]'
    : embed.vertical
      ? 'w-full max-w-[340px] mx-auto aspect-[9/16]'
      : 'w-full aspect-video'

  return (
    <div className={className}>
      <div className={`rounded-xl overflow-hidden border border-border bg-black/5 ${frameClass}`}>
        <iframe
          src={embed.embedUrl}
          title="Vídeo"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function TestimonialAvatar({ t }: { t: Testimonial }) {
  return t.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.photo_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs font-semibold">
      {t.author_name.slice(0, 1).toUpperCase()}
    </div>
  )
}

// whitespace-pre-wrap: o Textarea de depoimento (admin) deixa o autor quebrar
// linha/separar parágrafos com Enter, mas HTML colapsa a quebra de linha num
// espaço só por padrão — sem isso, o texto saía inteiro grudado numa linha
// só. Vale tanto no card (com line-clamp) quanto no modal com o texto todo.
function TestimonialCard({ t, onOpen }: { t: Testimonial; onOpen: () => void }) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const check = () => setTruncated(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [t.content])

  return (
    <div className="snap-start shrink-0 basis-full sm:basis-[calc(50%-6px)] rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col">
      <div className="flex items-center gap-3">
        <TestimonialAvatar t={t} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{t.author_name}</p>
          {t.author_role && <p className="text-xs text-muted-foreground truncate">{t.author_role}</p>}
        </div>
      </div>
      {t.content && (
        <p ref={textRef} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">&quot;{t.content.replace(/\n\s*\n+/g, '\n')}&quot;</p>
      )}
      {truncated && (
        <button type="button" onClick={onOpen} className="mt-auto pt-1 self-start text-sm font-medium text-primary hover:underline">
          Ler mais
        </button>
      )}
    </div>
  )
}

const AUTOPLAY_MS = 5000

// Depoimentos em carrossel (scroll-snap nativo, sem lib): 1 card por vez no
// celular, 2 a partir de `sm`. Avança sozinho da direita pra esquerda a cada
// poucos segundos (volta ao início no fim); pausa com mouse em cima, toque ou
// modal aberto, e não anima com "reduzir movimento" ligado. Cards mostram só o
// começo do texto; "Ler mais" abre o depoimento inteiro num modal. Setas +
// bolinhas só aparecem se houver mais cards do que cabem na tela. Idêntico
// entre a página de Famtour e a de Evento. Vídeo e galeria moram em
// TripVideo/TripGallery, porque a página os posiciona AO LADO da capa.
export function TripMediaSections({ testimonials }: { testimonials: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const openTestimonial = testimonials.find((t) => t.id === openId) ?? null

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < max - 4)
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : el.clientWidth
    const total = max > 4 ? Math.max(1, Math.round(max / step) + 1) : 1
    setPages(total)
    setPage(max > 4 ? Math.min(total - 1, Math.round(el.scrollLeft / step)) : 0)
  }, [])

  useEffect(() => {
    measure()
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, testimonials.length])

  function stepPx() {
    const el = trackRef.current
    const first = el?.firstElementChild as HTMLElement | null
    return first ? first.offsetWidth + 12 : el?.clientWidth ?? 0
  }

  function scrollByCard(dir: 1 | -1) {
    trackRef.current?.scrollBy({ left: dir * stepPx(), behavior: 'smooth' })
  }

  function goToPage(i: number) {
    trackRef.current?.scrollTo({ left: i * stepPx(), behavior: 'smooth' })
  }

  useEffect(() => {
    if (pages <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const el = trackRef.current
      if (!el || pausedRef.current || document.hidden) return
      const max = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= max - 4) el.scrollTo({ left: 0, behavior: 'smooth' })
      else el.scrollBy({ left: stepPx(), behavior: 'smooth' })
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [pages])

  useEffect(() => {
    pausedRef.current = openId !== null
  }, [openId])

  if (testimonials.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Depoimentos de quem foi</p>
        </div>
        {pages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canPrev}
              aria-label="Depoimento anterior"
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canNext}
              aria-label="Próximo depoimento"
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        onScroll={measure}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = openId !== null }}
        onTouchStart={() => { pausedRef.current = true }}
        onTouchEnd={() => { setTimeout(() => { pausedRef.current = openId !== null }, AUTOPLAY_MS) }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} t={t} onOpen={() => setOpenId(t.id)} />
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Ir para o depoimento ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>
      )}

      <Dialog open={openTestimonial !== null} onOpenChange={(o) => { if (!o) setOpenId(null) }}>
        <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg">
          {openTestimonial && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Depoimento de {openTestimonial.author_name}</DialogTitle>
                <div className="flex items-center gap-3 pr-8">
                  <TestimonialAvatar t={openTestimonial} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{openTestimonial.author_name}</p>
                    {openTestimonial.author_role && <p className="text-xs text-muted-foreground">{openTestimonial.author_role}</p>}
                  </div>
                </div>
              </DialogHeader>
              <div className="overflow-y-auto pr-1">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">&quot;{openTestimonial.content}&quot;</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TripGallery({ photos, className }: { photos: Photo[]; className?: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (photos.length === 0) return null

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Galeria de fotos</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
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

      {lightboxIndex !== null && (
        <ImageLightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}
