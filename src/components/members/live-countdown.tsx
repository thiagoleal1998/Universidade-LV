'use client'

import { useEffect, useState } from 'react'

function formatRemaining(ms: number): string {
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

export function LiveCountdown({ liveAt }: { liveAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(liveAt).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(liveAt).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [liveAt])

  if (remaining <= 0) return null

  return (
    <span className="font-mono text-xs font-semibold tabular-nums">
      {formatRemaining(remaining)}
    </span>
  )
}
