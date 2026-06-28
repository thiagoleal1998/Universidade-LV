'use client'

import { useState, useEffect, CSSProperties } from 'react'
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react'

type Announcement = { id: string; title: string; body: string; created_at: string }

const STORAGE_KEY = 'dismissed_announcements'

type Phase = 'in' | 'visible' | 'out'

export function AnnouncementTicker({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('visible')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setDismissed(new Set(JSON.parse(raw)))
    } catch {}
    setMounted(true)
  }, [])

  const active = mounted ? announcements.filter((a) => !dismissed.has(a.id)) : []
  const safeIdx = active.length > 0 ? Math.min(currentIdx, active.length - 1) : 0
  const current = active[safeIdx]

  const hasBody = current?.body?.trim().length > 0

  // Auto-cycle between announcements
  useEffect(() => {
    if (active.length <= 1) return
    const id = setInterval(() => setPhase('out'), 5000)
    return () => clearInterval(id)
  }, [active.length])

  // Panel slide transition
  useEffect(() => {
    if (phase === 'out') {
      const t = setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % Math.max(1, active.length))
        setPhase('in')
        setExpanded(false)
      }, 280)
      return () => clearTimeout(t)
    }
    if (phase === 'in') {
      const t = setTimeout(() => setPhase('visible'), 30)
      return () => clearTimeout(t)
    }
  }, [phase, active.length])

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
    setCurrentIdx(0)
    setExpanded(false)
    setPhase('visible')
  }

  if (!mounted || active.length === 0 || !current) return null

  const textStyle: CSSProperties = {
    transition: 'opacity 280ms ease, transform 280ms ease',
    opacity: phase === 'visible' ? 1 : 0,
    transform: phase === 'out' ? 'translateY(-8px)' : phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
  }

  return (
    <div className="w-full sticky top-0 z-10 border-b border-orange-600/20">
      {/* Ticker bar — alinhado em altura com a caixa da logo (min-h-[64px]) */}
      <div className="bg-orange-500 text-white flex items-center px-4 sm:px-6 min-h-[64px]">

        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0 mr-3">
          <Megaphone className="w-3.5 h-3.5 text-orange-100" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-200 hidden sm:block">
            Comunicado
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-orange-400/50 shrink-0 mr-3" />

        {/* Cycling title */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-semibold truncate leading-tight" style={textStyle}>
            {current.title}
          </p>
        </div>

        {/* Counter */}
        {active.length > 1 && (
          <span className="text-[10px] font-semibold text-orange-200 shrink-0 ml-3 tabular-nums">
            {safeIdx + 1}/{active.length}
          </span>
        )}

        {/* Expand */}
        {hasBody && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-2 shrink-0 text-orange-100/80 hover:text-white transition-colors p-1 rounded"
            title={expanded ? 'Recolher' : 'Ler mais'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => dismiss(current.id)}
          className="ml-1 shrink-0 text-orange-100/80 hover:text-white transition-colors p-1 rounded"
          title="Dispensar comunicado"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable body — smooth height via grid + fundo neutro suave */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded && hasBody ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="bg-orange-50 dark:bg-orange-950/40 border-t border-orange-200/60 dark:border-orange-800/40 px-4 sm:px-6 py-4">
            <div
              className="text-sm text-orange-900/80 dark:text-orange-100/80 leading-relaxed whitespace-pre-wrap [&_strong]:font-bold [&_em]:italic [&_u]:underline"
              dangerouslySetInnerHTML={{ __html: current.body }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
