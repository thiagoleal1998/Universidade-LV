'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignFeedback, updateFeedbackStatus, addFeedbackNote } from '@/app/actions/feedback'
import type { FeedbackReport, FeedbackStatus, AdminOption } from '@/app/actions/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FeedbackTimeline } from '@/components/ui/feedback-timeline'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { toast } from 'sonner'
import { Bug, Lightbulb, ChevronDown, ChevronUp, Link2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = FeedbackStatus | 'all'

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

const UNASSIGNED = '__unassigned__'

export function FeedbackPanel({ reports, admins }: { reports: FeedbackReport[]; admins: AdminOption[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isPending, startSave] = useTransition()
  const [lightbox, setLightbox] = useState<{ reportId: string; index: number } | null>(null)

  // Mantém o card aberto visível mesmo se o status mudar para fora do filtro
  // atual — senão o chamado some da tela no meio da edição do admin.
  const filtered = reports.filter((r) => statusFilter === 'all' || r.status === statusFilter || r.id === openId)
  const openCount = reports.filter((r) => r.status === 'open').length

  function handleStatusChange(id: string, status: FeedbackStatus) {
    startSave(async () => {
      const r = await updateFeedbackStatus(id, status)
      if (r?.error) toast.error(r.error)
      else { toast.success(`Status alterado para "${STATUS_LABEL[status]}".`); router.refresh() }
    })
  }

  function handleAssign(id: string, assignedTo: string) {
    startSave(async () => {
      const r = await assignFeedback(id, assignedTo === UNASSIGNED ? null : assignedTo)
      if (r?.error) toast.error(r.error)
      else { toast.success('Responsável atualizado!'); router.refresh() }
    })
  }

  function handleSaveNote(id: string) {
    const note = notes[id] ?? ''
    startSave(async () => {
      const r = await addFeedbackNote(id, note)
      if (r?.error) toast.error(r.error)
      else { toast.success('Nota salva! O membro foi notificado.'); setNotes((p) => ({ ...p, [id]: '' })); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { key: 'open', label: `Abertos (${openCount})` },
          { key: 'in_progress', label: 'Em andamento' },
          { key: 'resolved', label: 'Finalizados' },
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
                      <p className="text-sm font-medium text-foreground truncate">{report.title || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {report.member_name || 'Membro'}
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
                    <div
                      className="rich-text text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2"
                      dangerouslySetInnerHTML={{ __html: report.message }}
                    />

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

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Página: {report.page_url || '—'}</span>
                      <span>{new Date(report.created_at).toLocaleString('pt-BR')}</span>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Select
                          value={report.status}
                          onValueChange={(v) => handleStatusChange(report.id, v as FeedbackStatus)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em andamento</SelectItem>
                            <SelectItem value="resolved">Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Responsável:</span>
                        <Select
                          value={report.assigned_to ?? UNASSIGNED}
                          onValueChange={(v) => handleAssign(report.id, v as string)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Ninguém</SelectItem>
                            {admins.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <FeedbackTimeline events={report.events} />

                    <div>
                      <Textarea
                        value={notes[report.id] ?? ''}
                        onChange={(e) => setNotes((p) => ({ ...p, [report.id]: e.target.value }))}
                        placeholder="Escreva uma resposta para o membro..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    <Button
                      size="sm"
                      disabled={isPending || !(notes[report.id] ?? '').trim()}
                      onClick={() => handleSaveNote(report.id)}
                    >
                      Enviar resposta
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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
