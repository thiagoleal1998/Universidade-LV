'use client'

import { useState } from 'react'
import type { FeedbackReport } from '@/app/actions/feedback'
import { Badge } from '@/components/ui/badge'
import { Bug, Lightbulb, ChevronDown, ChevronUp, Link2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MyFeedbackList({ reports }: { reports: FeedbackReport[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (reports.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground bg-card border rounded-2xl">
        Você ainda não abriu nenhum chamado.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const isOpen = openId === report.id
        const isResolved = report.status === 'resolved'
        return (
          <div key={report.id} className="bg-card border rounded-xl overflow-hidden">
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
                  <p className="text-sm font-medium text-foreground truncate">{report.title || 'Sem título'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
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
                <div className="rich-text text-sm text-foreground" dangerouslySetInnerHTML={{ __html: report.message }} />

                {report.link_url && (
                  <a href={report.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Link2 className="w-3 h-3" />
                    {report.link_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {report.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt="Anexo" className="w-16 h-16 object-cover rounded-lg border border-border" />
                      </a>
                    ))}
                  </div>
                )}

                {isResolved && report.admin_note && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Resposta</p>
                    <p className="text-sm text-foreground">{report.admin_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
