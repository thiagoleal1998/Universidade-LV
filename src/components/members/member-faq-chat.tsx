'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { X, Search, ChevronDown, ChevronUp, MessageSquare, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FaqItem } from '@/app/actions/faq'

const BOT_IMG = '/faq-bot.png'

function BotImage({ className = '' }: { className?: string }) {
  const [error, setError] = useState(false)
  if (error) {
    return (
      <div className={`bg-primary rounded-full flex items-center justify-center ${className}`}>
        <HelpCircle className="w-8 h-8 text-primary-foreground" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BOT_IMG}
      alt="Assistente"
      onError={() => setError(true)}
      className={className}
      draggable={false}
    />
  )
}

export function MemberFaqChat({ items, assistantName = 'Assistente', assistantSubtitle = 'Perguntas frequentes' }: { items: FaqItem[]; assistantName?: string; assistantSubtitle?: string }) {
  const [open, setOpen] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function dismissBubble() {
    setShowBubble(false)
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter(
      (item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    )
  }, [items, query])

  if (items.length === 0) return null

  return (
    <>
      {/* Floating bot + bubble */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 select-none">

        {/* Speech bubble */}
        {showBubble && (
          <div className="relative bg-card border border-border rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 mr-2">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">Precisa de ajuda?</span>
            <button
              type="button"
              onClick={dismissBubble}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Tail apontando para o robô */}
            <span className="absolute -bottom-2 right-7 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
          </div>
        )}

        {/* Robot button */}
        <button
          type="button"
          onClick={() => { setOpen(true); dismissBubble() }}
          className="hover:scale-105 active:scale-95 transition-transform animate-faq-float"
          title="Abrir ajuda"
        >
          <BotImage className="w-20 h-auto drop-shadow-lg" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
      )}

      {/* FAQ Panel */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 w-full sm:w-96 h-[70vh] sm:h-[600px] bg-card border border-border shadow-2xl flex flex-col transition-transform duration-300 sm:rounded-tl-2xl sm:rounded-bl-2xl',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <BotImage className="w-9 h-9 object-contain shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{assistantName}</p>
              <p className="text-xs text-muted-foreground">{assistantSubtitle}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setExpandedId(null) }}
              placeholder="Buscar dúvida..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* FAQ list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhuma resposta encontrada para &ldquo;{query}&rdquo;.
            </div>
          )}
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id
            return (
              <div key={item.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors gap-2"
                >
                  <span className="text-sm font-medium text-foreground flex-1">{item.question}</span>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <Link
            href="/dashboard/comunidade"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Não encontrou? Fale na Comunidade
          </Link>
        </div>
      </div>
    </>
  )
}
