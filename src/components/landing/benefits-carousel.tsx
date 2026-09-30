'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type BenefitCardData = { icon: ReactNode; title: string; description: string }

const AUTOPLAY_MS = 5000

// Carrossel de benefícios (scroll-snap nativo, sem lib): 1 card por vez no
// celular, 2 a partir de `sm`, 3 a partir de `lg`. Mesmo mecanismo já usado
// no carrossel de depoimentos de Famtour/Evento (autoplay, pausa em
// hover/touch, setas + bolinhas só quando há mais cards do que cabem,
// respeita `prefers-reduced-motion`) — adaptado aqui sem o modal "Ler mais"
// (descrição de benefício é curta, não precisa truncar).
export function BenefitsCarousel({ benefits }: { benefits: BenefitCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < max - 4)
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 20 : el.clientWidth
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
  }, [measure, benefits.length])

  function stepPx() {
    const el = trackRef.current
    const first = el?.firstElementChild as HTMLElement | null
    return first ? first.offsetWidth + 20 : el?.clientWidth ?? 0
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

  if (benefits.length === 0) return null

  return (
    <div className="space-y-4">
      {pages > 1 && (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label="Benefício anterior"
            className="w-9 h-9 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label="Próximo benefício"
            className="w-9 h-9 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={trackRef}
        onScroll={measure}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
        onTouchStart={() => { pausedRef.current = true }}
        onTouchEnd={() => { setTimeout(() => { pausedRef.current = false }, AUTOPLAY_MS) }}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {benefits.map((b, i) => (
          <div
            key={i}
            className="group shrink-0 snap-start basis-full sm:basis-[calc(50%-10px)] lg:basis-[calc(33.333%-14px)] flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:border-green-300 hover:shadow-md transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/15 transition-colors">
              {b.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-snug">{b.title}</h3>
              {b.description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{b.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Ir para o benefício ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
