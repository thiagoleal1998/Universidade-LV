'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, PlayCircle, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchContent, type SearchResult } from '@/app/actions/search'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  // Search on query change
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    startTransition(async () => {
      const res = await searchContent(query)
      setResults(res)
      setSelectedIndex(0)
    })
  }, [query])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {isPending
            ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
            : <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter' && results[selectedIndex]) {
                navigate(results[selectedIndex].href)
              }
            }}
            placeholder="Buscar aulas ou cursos..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="py-2 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => navigate(r.href)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  r.type === 'curso' ? 'bg-primary/10' : 'bg-muted'
                )}>
                  {r.type === 'curso'
                    ? <BookOpen className={cn('w-3.5 h-3.5', i === selectedIndex ? 'text-primary' : 'text-primary')} />
                    : <PlayCircle className={cn('w-3.5 h-3.5', i === selectedIndex ? 'text-primary' : 'text-muted-foreground')} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {r.type === 'curso' ? 'Curso' : 'Aula'}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !isPending && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum resultado para &ldquo;{query}&rdquo;
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 text-xs text-muted-foreground bg-muted/30">
          <span><kbd className="bg-card border border-border px-1.5 py-0.5 rounded text-xs font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="bg-card border border-border px-1.5 py-0.5 rounded text-xs font-mono">Enter</kbd> abrir</span>
          <span><kbd className="bg-card border border-border px-1.5 py-0.5 rounded text-xs font-mono">Esc</kbd> fechar</span>
          <span className="ml-auto hidden sm:inline">
            <kbd className="bg-card border border-border px-1.5 py-0.5 rounded text-xs font-mono">Ctrl K</kbd>
          </span>
        </div>
      </div>
    </div>
  )
}
