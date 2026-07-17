'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackReport, FeedbackStatus } from '@/app/actions/feedback'
import { addFeedbackNote } from '@/app/actions/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { FeedbackTimeline } from '@/components/ui/feedback-timeline'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Bug, Lightbulb, ChevronDown, ChevronUp, Link2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Finalizado',
}

const STATUS_BADGE_VARIANT: Record<FeedbackStatus, 'default' | 'outline' | 'secondary'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
}

function isNoteEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim()
}

export function MyFeedbackList({ reports }: { reports: FeedbackReport[] }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ reportId: string; index: number } | null>(null)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [replyResetKey, setReplyResetKey] = useState<Record<string, number>>({})
  const [isSending, startSend] = useTransition()

  function handleSendReply(id: string) {
    const note = replies[id] ?? ''
    startSend(async () => {
      const r = await addFeedbackNote(id, note)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Resposta enviada!')
        setReplies((p) => ({ ...p, [id]: '' }))
        setReplyResetKey((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
        router.refresh()
      }
    })
  }

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
                    {report.assigned_name && ` · Responsável: ${report.assigned_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={STATUS_BADGE_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-4 space-y-4">
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
                    {report.attachments.map((a, i) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setLightbox({ reportId: report.id, index: i })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.url} alt="Anexo" className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                <FeedbackTimeline events={report.events} />

                <div>
                  <RichTextEditor
                    key={`reply-${report.id}-${replyResetKey[report.id] ?? 0}`}
                    content={replies[report.id] ?? ''}
                    onChange={(v) => setReplies((p) => ({ ...p, [report.id]: v }))}
                  />
                </div>

                <Button
                  size="sm"
                  disabled={isSending || isNoteEmpty(replies[report.id] ?? '')}
                  onClick={() => handleSendReply(report.id)}
                >
                  Enviar resposta
                </Button>
              </div>
            )}
          </div>
        )
      })}

      {lightbox && (() => {
        const report = reports.find((r) => r.id === lightbox.reportId)
        if (!report) return null
        return (
          <ImageLightbox
            images={report.attachments}
            index={lightbox.index}
            onClose={() => setLightbox(null)}
            onNavigate={(index) => setLightbox({ reportId: lightbox.reportId, index })}
          />
        )
      })()}
    </div>
  )
}
