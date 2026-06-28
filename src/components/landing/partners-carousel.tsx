'use client'

import { useRef, useEffect } from 'react'

type Partner = { name: string; logo_url: string }

const ITEM_W = 120 // px por slot
const SPEED  = 50  // px/s

export function PartnersCarousel({ partners, title }: { partners: Partner[]; title: string }) {
  if (!partners.length) return null

  const copiesHalf = partners.length < 5 ? 3 : partners.length < 9 ? 2 : 1
  const items      = Array.from({ length: copiesHalf * 2 }, () => partners).flat()
  const halfWidth  = copiesHalf * partners.length * ITEM_W

  const trackRef  = useRef<HTMLDivElement>(null)
  const posRef    = useRef(0)
  const rafRef    = useRef<number>(0)
  const pausedRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    function step(ts: number) {
      if (!pausedRef.current) {
        if (lastTsRef.current !== null) {
          posRef.current = (posRef.current + SPEED * (ts - lastTsRef.current) / 1000) % halfWidth
        }
        lastTsRef.current = ts
        if (track) track.style.transform = `translateX(-${posRef.current}px)`
      } else {
        lastTsRef.current = null
      }
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    const pause  = () => { pausedRef.current = true }
    const resume = () => { pausedRef.current = false }
    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)

    return () => {
      cancelAnimationFrame(rafRef.current)
      track.removeEventListener('mouseenter', pause)
      track.removeEventListener('mouseleave', resume)
    }
  }, [halfWidth])

  return (
    <div className="max-w-full mx-auto">
      {title && (
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
          {title}
        </p>
      )}
      <div
        className="overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 rounded-xl py-2"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div ref={trackRef} className="flex items-center will-change-transform">
          {items.map((p, i) => (
            <div
              key={i}
              style={{ width: ITEM_W }}
              className="shrink-0 h-14 flex items-center justify-center px-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.logo_url}
                alt={p.name}
                style={{ width: ITEM_W - 24, height: 32 }}
                className="object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 ease-out"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
