'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Medal, ChevronLeft, ChevronRight } from 'lucide-react'

type Region = { name: string; agency1: string; value1: string; agency2: string; value2: string }

const AUTO_ADVANCE_MS = 3500
const RESUME_AFTER_INTERACTION_MS = 5000

export function WinnersCarousel({ regions }: { regions: Region[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)
  const pausedUntilRef = useRef(0)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollRef = useRef(0)

  const scrollToIndex = useCallback((idx: number) => {
    const t = trackRef.current
    if (!t || regions.length === 0) return
    const clamped = ((idx % regions.length) + regions.length) % regions.length
    const card = t.children[clamped] as HTMLElement | undefined
    if (!card) return
    indexRef.current = clamped
    t.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
  }, [regions.length])

  // Avança/recua um passo com base na posição REAL de scroll, não em indexRef
  // (que pode dessincronizar quando o navegador limita/"clampa" o scrollLeft
  // perto do fim do trilho — sem isso o carrossel parecia travar).
  const step = useCallback((dir: 1 | -1) => {
    const t = trackRef.current
    if (!t || regions.length === 0) return
    const maxScroll = t.scrollWidth - t.clientWidth
    const atEnd = t.scrollLeft >= maxScroll - 2
    const atStart = t.scrollLeft <= 2

    if (dir > 0 && atEnd) { scrollToIndex(0); return }
    if (dir < 0 && atStart) { scrollToIndex(regions.length - 1); return }
    scrollToIndex(indexRef.current + dir)
  }, [regions.length, scrollToIndex])

  const pause = () => { pausedUntilRef.current = Date.now() + RESUME_AFTER_INTERACTION_MS }

  const goPrev = () => { pause(); step(-1) }
  const goNext = () => { pause(); step(1) }

  // Avanço automático contínuo — não para depois do primeiro ciclo, e respeita
  // interações manuais recentes (drag ou clique nas setas) antes de retomar.
  useEffect(() => {
    if (regions.length <= 1) return
    const interval = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return
      step(1)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(interval)
  }, [regions.length, step])

  function closestIndex(t: HTMLDivElement): number {
    let closest = 0
    let min = Infinity
    Array.from(t.children).forEach((child, i) => {
      const diff = Math.abs((child as HTMLElement).offsetLeft - t.scrollLeft)
      if (diff < min) { min = diff; closest = i }
    })
    return closest
  }

  // Drag manual com mouse (touch já funciona nativamente via overflow-x-auto)
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return
    const t = trackRef.current
    if (!t) return
    draggingRef.current = true
    movedRef.current = false
    dragStartXRef.current = e.clientX
    dragStartScrollRef.current = t.scrollLeft
    pause()
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const t = trackRef.current
    if (!t) return
    const dx = e.clientX - dragStartXRef.current
    if (Math.abs(dx) > 3) movedRef.current = true
    t.scrollLeft = dragStartScrollRef.current - dx
  }
  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    const t = trackRef.current
    if (t && movedRef.current) scrollToIndex(closestIndex(t))
  }

  if (regions.length === 0) return null

  return (
    <div className="relative group/carousel">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
      >
        {regions.map((region) => (
          <div
            key={region.name}
            className="snap-start shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] bg-card border border-amber-400/20 rounded-xl p-4 space-y-3"
          >
            <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/60 uppercase tracking-widest">
              {region.name}
            </p>
            {region.agency1 && (
              <div className="flex items-start gap-2.5">
                <Medal className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{region.agency1}</p>
                  {region.value1 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{region.value1}</p>
                  )}
                </div>
              </div>
            )}
            {region.agency2 && (
              <div className="flex items-start gap-2.5">
                <Medal className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground/80 leading-tight">{region.agency2}</p>
                  {region.value2 && (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{region.value2}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {regions.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Região anterior"
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-card border border-border shadow-sm items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Próxima região"
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-card border border-border shadow-sm items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}
