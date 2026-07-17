'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resolveFeedback } from '@/app/actions/feedback'
import type { FeedbackReport } from '@/app/actions/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bug, Lightbulb, ChevronDown, ChevronUp, CheckCircle2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'resolved' | 'all'

export function FeedbackPanel({ reports }: { reports: FeedbackReport[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [isPending, startSave] = useTransition()

  const filtered = reports.filter((r) => statusFilter === 'all' || r.status === statusFilter)
  const openCount = reports.filter((r) => r.status === 'open').length

  function handleToggleResolved(id: string, currentlyResolved: boolean) {
    startSave(async () => {
      const r = await resolveFeedback(id, !currentlyResolved)
      if (r?.error) toast.error(r.error)
      else { toast.success(currentlyResolved ? 'Reaberto.' : 'Marcado como resolvido!'); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { key: 'open', label: `Abertos (${openCount})` },
          { key: 'resolved', label: 'Resolvidos' },
          { key: 'all', label: 'Todos' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              statusFilter === key ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum feedback encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const isOpen = openId === report.id
            const isResolved = report.status === 'resolved'
            return (
              <div key={report.id} className="border rounded-xl overflow-hidden bg-card">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : report.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                      report.type === 'bug' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                    )}>
                      {report.type === 'bug' ? <Bug className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{report.member_name || 'Membro'}</p>
                      <p className="text-xs text-muted-foreground truncate">{report.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isResolved ? 'outline' : 'default'}>
                      {isResolved ? 'Resolvido' : 'Aberto'}
                    </Badge>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-4 space-y-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 rounded-lg px-3 py-2">
                      {report.message}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Página: {report.page_url || '—'}</span>
                      <span>{new Date(report.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isResolved ? 'outline' : 'default'}
                      disabled={isPending}
                      onClick={() => handleToggleResolved(report.id, isResolved)}
                      className="gap-2"
                    >
                      {isResolved ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isResolved ? 'Reabrir' : 'Marcar como resolvido'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
