'use client'

import { useRef, useEffect } from 'react'
import { Medal } from 'lucide-react'

type Region = { name: string; agency1: string; value1: string; agency2: string; value2: string }

export function WinnersCarousel({ regions }: { regions: Region[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (regions.length <= 1) return
    const interval = setInterval(() => {
      const t = trackRef.current
      if (!t) return
      const card = t.children[indexRef.current] as HTMLElement
      if (!card) return
      indexRef.current = (indexRef.current + 1) % regions.length
      const next = t.children[indexRef.current] as HTMLElement
      if (!next) return
      t.scrollTo({ left: next.offsetLeft, behavior: 'smooth' })
    }, 3500)
    return () => clearInterval(interval)
  }, [regions.length])

  if (regions.length === 0) return null

  return (
    <div
      ref={trackRef}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
  )
}
