'use client'

import { useState, useEffect, CSSProperties } from 'react'
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react'

type Announcement = { id: string; title: string; body: string; created_at: string }
type Slide = { text: string; annId: string; isTitle: boolean }

const STORAGE_KEY = 'dismissed_announcements'
type Phase = 'in' | 'visible' | 'out'

function parseSlides(ann: Announcement): Slide[] {
  const slides: Slide[] = [{ text: ann.title, annId: ann.id, isTitle: true }]
  if (!ann.body?.trim()) return slides

  // Convert block HTML tags to newlines before stripping
  const normalized = ann.body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const phrases = normalized
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s !== ann.title.trim())

  for (const phrase of phrases) {
    slides.push({ text: phrase, annId: ann.id, isTitle: false })
  }
  return slides
}

export function AnnouncementTicker({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [slideIdx, setSlideIdx] = useState(0)
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
  const slides: Slide[] = active.flatMap(parseSlides)

  const safeIdx = slides.length > 0 ? slideIdx % slides.length : 0
  const currentSlide = slides[safeIdx]
  const currentAnn = active.find((a) => a.id === currentSlide?.annId)
  const annPosition = currentAnn ? active.indexOf(currentAnn) : 0

  const hasBody = (currentAnn?.body?.trim().length ?? 0) > 0

  // Auto-cycle through slides like a letreiro
  useEffect(() => {
    if (slides.length <= 1) return
    const delay = currentSlide?.isTitle ? 3000 : 4000
    const id = setTimeout(() => setPhase('out'), delay)
    return () => clearTimeout(id)
  }, [slides.length, safeIdx, currentSlide?.isTitle])

  // Phase transitions: out → swap → in → visible
  useEffect(() => {
    if (phase === 'out') {
      const t = setTimeout(() => {
        setSlideIdx((prev) => (prev + 1) % Math.max(1, slides.length))
        setPhase('in')
        setExpanded(false)
      }, 280)
      return () => clearTimeout(t)
    }
    if (phase === 'in') {
      const t = setTimeout(() => setPhase('visible'), 30)
      return () => clearTimeout(t)
    }
  }, [phase, slides.length])

  function dismiss(annId: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(annId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
    setSlideIdx(0)
    setExpanded(false)
    setPhase('visible')
  }

  if (!mounted || slides.length === 0 || !currentSlide || !currentAnn) return null

  const textStyle: CSSProperties = {
    transition: 'opacity 280ms ease, transform 280ms ease',
    opacity: phase === 'visible' ? 1 : 0,
    transform:
      phase === 'out' ? 'translateY(-10px)' :
      phase === 'in'  ? 'translateY(10px)'  :
      'translateY(0)',
  }

  return (
    <div className="w-full sticky top-0 z-10 border-b border-orange-600/20">
      {/* Ticker bar */}
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

        {/* Letreiro — cycling slide */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            className={currentSlide.isTitle
              ? 'text-sm font-bold truncate leading-tight'
              : 'text-sm font-normal text-white/90 truncate leading-tight'}
            style={textStyle}
          >
            {currentSlide.text}
          </p>
        </div>

        {/* Announcement counter when there are multiple */}
        {active.length > 1 && (
          <span className="text-[10px] font-semibold text-orange-200 shrink-0 ml-3 tabular-nums">
            {annPosition + 1}/{active.length}
          </span>
        )}

        {/* Expand to full body */}
        {hasBody && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-2 shrink-0 text-orange-100/80 hover:text-white transition-colors p-1 rounded"
            title={expanded ? 'Recolher' : 'Ler completo'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Dismiss this announcement */}
        <button
          type="button"
          onClick={() => dismiss(currentAnn.id)}
          className="ml-1 shrink-0 text-orange-100/80 hover:text-white transition-colors p-1 rounded"
          title="Dispensar comunicado"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable full body — smooth height + fundo neutro */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded && hasBody ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="bg-orange-50 dark:bg-orange-950/40 border-t border-orange-200/60 dark:border-orange-800/40 px-4 sm:px-6 py-4">
            <p className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-2">
              {currentAnn.title}
            </p>
            <div
              className="text-sm text-orange-900/80 dark:text-orange-100/80 leading-relaxed whitespace-pre-wrap [&_strong]:font-bold [&_em]:italic [&_u]:underline"
              dangerouslySetInnerHTML={{ __html: currentAnn.body }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
