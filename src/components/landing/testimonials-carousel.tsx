'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type Testimonial = {
  name: string
  role: string
  text: string
  avatar_url: string
  rating?: number
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const ini = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return (
    <div className="w-12 h-12 rounded-full bg-green-600/15 text-green-700 font-bold text-sm flex items-center justify-center shrink-0 uppercase ring-2 ring-green-600/20">
      {ini}
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn('w-4 h-4', s <= rating ? 'text-amber-400 fill-amber-400' : 'text-border fill-transparent')}
        />
      ))}
    </div>
  )
}

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [target, setTarget] = useState(0)
  const [shown, setShown] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [visible, setVisible] = useState(true)
  const lockedRef = useRef(false)

  function go(next: number) {
    if (lockedRef.current || next === target) return
    lockedRef.current = true
    const direction = next > target || (target === testimonials.length - 1 && next === 0) ? 1 : -1
    setDir(direction as 1 | -1)
    setTarget(next)
    setVisible(false)
    setTimeout(() => {
      setShown(next)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true)
          setTimeout(() => { lockedRef.current = false }, 500)
        })
      })
    }, 350)
  }

  const prev = () => go((target - 1 + testimonials.length) % testimonials.length)
  const next = () => go((target + 1) % testimonials.length)

  useEffect(() => {
    if (testimonials.length <= 1) return
    const id = setInterval(() => {
      go((target + 1) % testimonials.length)
    }, 5500)
    return () => clearInterval(id)
  }, [target, testimonials.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!testimonials.length) return null
  const t = testimonials[shown]

  return (
    <div className="relative max-w-2xl mx-auto">
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0px)' : `translateX(${dir * 40}px)`,
          transition: 'opacity 350ms ease-in-out, transform 350ms ease-in-out',
        }}
      >
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm text-center space-y-5">
          {t.rating && t.rating > 0 ? (
            <Stars rating={t.rating} />
          ) : (
            <Quote className="w-8 h-8 text-green-600/30 mx-auto" />
          )}
          <p className="text-foreground text-base md:text-lg leading-relaxed font-medium">"{t.text}"</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {t.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.avatar_url} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <Initials name={t.name} />
            )}
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        </div>
      </div>

      {testimonials.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                style={{ width: i === target ? '24px' : '6px', transition: 'width 300ms ease-in-out' }}
                className={cn('h-1.5 rounded-full transition-colors duration-300', i === target ? 'bg-green-600' : 'bg-border hover:bg-muted-foreground')}
                aria-label={`Depoimento ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-border bg-background hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
