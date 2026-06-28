'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react'

type Announcement = { id: string; title: string; body: string; created_at: string }

const STORAGE_KEY = 'dismissed_announcements'

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

function AnnouncementBanner({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasBody = ann.body && ann.body.trim().length > 0

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      {/* Barra principal — cor primária da marca */}
      <div className="bg-primary px-5 py-3.5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <p className="text-sm font-semibold text-primary-foreground flex-1 leading-snug">
          {ann.title}
        </p>
        <span className="text-xs text-primary-foreground/60 shrink-0 hidden sm:block">
          {new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
        {hasBody && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-primary-foreground/70 hover:text-primary-foreground transition-colors shrink-0 p-0.5"
            title={expanded ? 'Recolher' : 'Ver mais'}
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-primary-foreground/60 hover:text-primary-foreground transition-colors shrink-0 p-0.5"
          title="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo expandível */}
      {hasBody && expanded && (
        <div className="bg-primary/8 border-x border-b border-primary/20 px-5 py-4">
          <div
            className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap [&_strong]:font-bold [&_em]:italic [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: ann.body }}
          />
        </div>
      )}
    </div>
  )
}

export function DismissibleAnnouncements({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDismissed(loadDismissed())
    setMounted(true)
  }, [])

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  if (!mounted || visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((ann) => (
        <AnnouncementBanner key={ann.id} ann={ann} onDismiss={() => dismiss(ann.id)} />
      ))}
    </div>
  )
}
