'use client'

import { Search, X, CheckCircle2, Circle, ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TocEntry = {
  id: string
  title: string
  isCompleted: boolean
  isDraft: boolean
  visible: boolean
  matchCount: number
}

export function ManualToc({
  entries,
  activeId,
  query,
  onQueryChange,
  onSelect,
  matchInfo,
  onPrevMatch,
  onNextMatch,
}: {
  entries: TocEntry[]
  activeId: string | null
  query: string
  onQueryChange: (v: string) => void
  onSelect: (id: string) => void
  matchInfo: { total: number; current: number } | null
  onPrevMatch: () => void
  onNextMatch: () => void
}) {
  const completedCount = entries.filter((e) => e.isCompleted).length

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar no manual..."
          className="w-full h-9 pl-8 pr-8 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {matchInfo && (
        <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
          <span>
            {matchInfo.total === 0
              ? 'Nenhum resultado'
              : `${matchInfo.current + 1} de ${matchInfo.total} resultados`}
          </span>
          {matchInfo.total > 0 && (
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={onPrevMatch} className="p-1 rounded hover:bg-muted" title="Resultado anterior">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={onNextMatch} className="p-1 rounded hover:bg-muted" title="Próximo resultado">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground px-0.5">
        {completedCount} de {entries.length} concluídas
      </p>

      <nav className="space-y-0.5">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors',
              !entry.visible && 'opacity-40',
              activeId === entry.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-muted/60'
            )}
          >
            {entry.isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="flex-1 truncate">{entry.title}</span>
            {entry.isDraft && (
              <Badge variant="secondary" className="text-[9px] py-0 px-1 shrink-0">rascunho</Badge>
            )}
            {entry.matchCount > 0 && (
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{entry.matchCount}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
