'use client'

import { useEffect, useState } from 'react'
import { Radio, X } from 'lucide-react'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

export function CountdownBar({ title, date }: { title: string; date: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(new Date(date)))
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(new Date(date))), 1000)
    return () => clearInterval(id)
  }, [date])

  if (dismissed || !timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="bg-green-800 text-white text-sm px-4 py-2.5 flex items-center justify-center gap-2.5 relative pr-10">
      <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
      <span className="font-medium text-white/90 hidden sm:inline truncate max-w-xs">{title}</span>
      <div className="flex items-center gap-1 font-mono font-bold text-sm">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white/10 rounded px-1.5 py-0.5">{pad(timeLeft.days)}d</span>
            <span className="opacity-40">:</span>
          </>
        )}
        <span className="bg-white/10 rounded px-1.5 py-0.5">{pad(timeLeft.hours)}h</span>
        <span className="opacity-40">:</span>
        <span className="bg-white/10 rounded px-1.5 py-0.5">{pad(timeLeft.minutes)}m</span>
        <span className="opacity-40">:</span>
        <span className="bg-white/10 rounded px-1.5 py-0.5">{pad(timeLeft.seconds)}s</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
