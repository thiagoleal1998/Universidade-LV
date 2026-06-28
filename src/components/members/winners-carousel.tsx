'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Medal } from 'lucide-react'

type Region = { name: string; agency1: string; value1: string; agency2: string; value2: string }

export function WinnersCarousel({ regions }: { regions: Region[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateNav = useCallback(() => {
    const t = trackRef.current
    if (!t) return
    setCanPrev(t.scrollLeft > 2)
    setCanNext(t.scrollLeft < t.scrollWidth - t.clientWidth - 2)
  }, [])

  useEffect(() => {
    updateNav()
    window.addEventListener('resize', updateNav)
    return () => window.removeEventListener('resize', updateNav)
  }, [updateNav, regions.length])

  function scrollByCard(dir: 1 | -1) {
    const t = trackRef.current
    if (!t) return
    const card = t.children[0] as HTMLElement
    if (!card) return
    // Step = card width + gap (gap-3 = 12px)
    t.scrollBy({ left: dir * (card.offsetWidth + 12), behavior: 'smooth' })
  }

  if (regions.length === 0) return null

  return (
    <div>
      {/* Track — snap-x para deslizar um card por vez */}
      <div
        ref={trackRef}
        onScroll={updateNav}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {regions.map((region) => (
          <div
            key={region.name}
            // 1 card mobile · 2 cards tablet · 3 cards desktop
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

      {/* Botões de navegação */}
      {regions.length > 1 && (
        <div className="flex justify-end gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label="Anterior"
            className="w-7 h-7 rounded-lg border border-amber-400/30 bg-background flex items-center justify-center text-amber-600 hover:bg-amber-500/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label="Próximo"
            className="w-7 h-7 rounded-lg border border-amber-400/30 bg-background flex items-center justify-center text-amber-600 hover:bg-amber-500/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
