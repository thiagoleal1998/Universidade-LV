'use client'

import { useEffect, useRef, useState } from 'react'

function parseNumber(raw: string): { prefix: string; value: number; suffix: string; useLocale: boolean } {
  const match = raw.trim().match(/^([^0-9]*)([0-9.,]+)([^0-9]*)$/)
  if (!match) return { prefix: '', value: 0, suffix: raw, useLocale: false }
  const numStr = match[2]
  const useLocale = /\d\.\d{3}/.test(numStr)
  const cleaned = numStr.replace(/\./g, '').replace(',', '.')
  return { prefix: match[1], value: parseFloat(cleaned) || 0, suffix: match[3], useLocale }
}

function Counter({ number, label }: { number: string; label: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const { prefix, value, suffix, useLocale } = parseNumber(number)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true
        observer.disconnect()
        const duration = 3000
        let startTime: number | null = null
        function tick(ts: number) {
          if (!startTime) startTime = ts
          const progress = Math.min((ts - startTime) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(eased * value)
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  const rounded = Math.round(count)
  const formatted = useLocale ? rounded.toLocaleString('pt-BR') : rounded.toString()

  return (
    <div ref={ref} className="px-4">
      <p className="text-2xl md:text-3xl font-bold tabular-nums">
        {prefix}{formatted}{suffix}
      </p>
      <p className="text-white/70 text-xs mt-1 font-medium uppercase tracking-wide">{label}</p>
    </div>
  )
}

export function StatsCounter({ stats }: { stats: { number: string; label: string }[] }) {
  // divide-x só funciona correctamente em grid de 1 linha — no mobile (2 col) o 3º item
  // ficaria com border-l indevida no início da 2ª linha. Por isso, para 4 stats usamos
  // md:divide-x para aplicar os divisores apenas quando o grid está em linha única.
  const gridClass =
    stats.length === 2 ? 'grid-cols-2 divide-x divide-white/20' :
    stats.length === 3 ? 'grid-cols-3 divide-x divide-white/20' :
    'grid-cols-2 md:grid-cols-4 md:divide-x md:divide-white/20'

  return (
    <div className={`grid gap-6 text-center ${gridClass}`}>
      {stats.map((s, i) => (
        <Counter key={i} number={s.number} label={s.label} />
      ))}
    </div>
  )
}
