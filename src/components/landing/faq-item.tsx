'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type FaqItemProps = {
  question: string
  answer: string
  open?: boolean
  onToggle?: () => void
}

export function FaqItem({ question, answer, open: openProp, onToggle }: FaqItemProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp !== undefined ? openProp : internalOpen
  const toggle = onToggle ?? (() => setInternalOpen(v => !v))
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!bodyRef.current) return
    setHeight(open ? bodyRef.current.scrollHeight : 0)
  }, [open])

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-colors duration-300',
      open ? 'border-primary/30 bg-primary/[0.03]' : 'border-border bg-card'
    )}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left group"
      >
        <span className={cn(
          'font-semibold text-base leading-snug transition-colors duration-200',
          open ? 'text-primary' : 'text-foreground group-hover:text-primary'
        )}>
          {question}
        </span>
        <span className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
          open
            ? 'bg-primary text-primary-foreground rotate-180'
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        )}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>

      <div
        style={{ height, transition: 'height 350ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        className="overflow-hidden"
      >
        <div ref={bodyRef}>
          <div className="px-6 pb-5 pt-1">
            <div className="border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
