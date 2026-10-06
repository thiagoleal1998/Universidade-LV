'use client'

import { Search } from 'lucide-react'

export function BuscaRapidaButton() {
  return (
    <button
      type="button"
      onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
      className="w-full flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted/50 transition-colors"
    >
      <Search className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">Busca rápida</span>
      <kbd className="text-xs bg-muted text-foreground px-1.5 py-0.5 rounded font-mono hidden md:block">Ctrl K</kbd>
    </button>
  )
}
