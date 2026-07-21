'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackReport, FeedbackStatus } from '@/app/actions/feedback'
import { addFeedbackNote } from '@/app/actions/feedback'
import { getUnreadFeedbackUpdateReportIds, markFeedbackReportNotificationRead } from '@/app/actions/notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { FeedbackTimeline } from '@/components/ui/feedback-timeline'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Bug, Lightbulb, ChevronDown, ChevronUp, Link2, ExternalLink, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Finalizado',
}

const STATUS_BADGE_CLASS: Record<FeedbackStatus, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

function isNoteEmpty(html: string): boolean {
  return !html.replace(/<[^>]*>/g, '').trim()
}

export function MyFeedbackList({ reports, initialOpenId = null }: { reports: FeedbackReport[]; initialOpenId?: string | null }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  const [lightbox, setLightbox] = useState<{ reportId: string; index: number } | null>(null)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [replyResetKey, setReplyResetKey] = useState<Record<string, number>>({})
  const [isSending, startSend] = useTransition()
  const [unreadReportIds, setUnreadReportIds] = useState<Set<string>>(new Set())

  // Vindo de uma notificação (link com ?report=<id>) — rola até o chamado
  // certo, já aberto, em vez de deixar o usuário procurar na lista.
  useEffect(() => {
    if (!initialOpenId) return
    const el = document.getElementById(`feedback-report-${initialOpenId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getUnreadFeedbackUpdateReportIds().then((ids) => setUnreadReportIds(new Set(ids)))
  }, [])

  function toggleOpen(id: string) {
    const willOpen = openId !== id
    setOpenId(willOpen ? id : null)
    if (willOpen && unreadReportIds.has(id)) {
      setUnreadReportIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      markFeedbackReportNotificationRead(id)
    }
  }

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
        const hasUpdate = unreadReportIds.has(report.id)
        return (
          <div key={report.id} id={`feedback-report-${report.id}`} className={cn(
            'bg-card border rounded-xl overflow-hidden',
            hasUpdate && 'border-primary/40'
          )}>
            <button
              type="button"
              onClick={() => toggleOpen(report.id)}
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
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                    {report.title || 'Sem título'}
                    {hasUpdate && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">
                        <Sparkles className="w-2.5 h-2.5" /> Nova atualização
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {report.assigned_name && ` · Responsável: ${report.assigned_name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={STATUS_BADGE_CLASS[report.status]}>{STATUS_LABEL[report.status]}</Badge>
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
