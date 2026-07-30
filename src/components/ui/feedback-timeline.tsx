'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackEvent } from '@/app/actions/feedback'
import { deleteFeedbackNote, editFeedbackNote } from '@/app/actions/feedback'
import { PlusCircle, UserCog, ArrowRightCircle, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { isRichTextEmpty } from '@/lib/rich-text-content'

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Finalizado',
}

function eventText(e: FeedbackEvent): string {
  switch (e.event_type) {
    case 'created':
      return `${e.actor_name || 'Membro'} abriu o chamado`
    case 'assigned':
      return e.assigned_name ? `Atribuído a ${e.assigned_name}` : 'Atribuição removida'
    case 'status_changed':
      return `Status alterado de "${STATUS_LABEL[e.from_status ?? ''] ?? e.from_status}" para "${STATUS_LABEL[e.to_status ?? ''] ?? e.to_status}"`
    case 'note_added':
      return e.actor_name ? `${e.actor_name} respondeu` : 'Nova resposta'
  }
}

function EventIcon({ type }: { type: FeedbackEvent['event_type'] }) {
  const base = 'w-6 h-6 rounded-full flex items-center justify-center shrink-0'
  if (type === 'created') return <div className={cn(base, 'bg-blue-500/15')}><PlusCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /></div>
  if (type === 'assigned') return <div className={cn(base, 'bg-amber-500/15')}><UserCog className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /></div>
  if (type === 'status_changed') return <div className={cn(base, 'bg-emerald-500/15')}><ArrowRightCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /></div>
  return <div className={cn(base, 'bg-violet-500/15')}><MessageSquare className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /></div>
}

export function FeedbackTimeline({
  events,
  reportId,
  canModerate = false,
}: {
  events: FeedbackEvent[]
  reportId?: string
  // Controles de editar/excluir mensagem — só o admin vê (feedback-panel.tsx).
  // A lista do membro (my-feedback-list.tsx) não passa essa prop: continua só
  // leitura, mas já mostra "(editada)"/"Mensagem excluída" quando aplicável.
  canModerate?: boolean
}) {
  if (events.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Linha do tempo</p>
      <div className="space-y-3">
        {events.map((e) => (
          <TimelineEvent key={e.id} event={e} reportId={reportId} canModerate={canModerate} />
        ))}
      </div>
    </div>
  )
}

function TimelineEvent({
  event: e, reportId, canModerate,
}: {
  event: FeedbackEvent
  reportId?: string
  canModerate: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(e.note_text ?? '')
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const canEditThis = canModerate && reportId && e.event_type === 'note_added' && !e.is_deleted

  function handleSave() {
    if (!reportId || isRichTextEmpty(draft)) return
    startSave(async () => {
      const r = await editFeedbackNote(e.id, reportId, draft)
      if (r?.error) toast.error(r.error)
      else { toast.success('Mensagem editada.'); setIsEditing(false); router.refresh() }
    })
  }

  function handleDelete() {
    if (!reportId) return
    startDelete(async () => {
      const r = await deleteFeedbackNote(e.id, reportId)
      if (r?.error) toast.error(r.error)
      else { toast.success('Mensagem excluída.'); router.refresh() }
    })
  }

  return (
    <div className="flex gap-2.5">
      <EventIcon type={e.event_type} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-foreground">{eventText(e)}</p>
          {canEditThis && !isEditing && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => { setDraft(e.note_text ?? ''); setIsEditing(true) }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Editar mensagem"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger render={
                  <button
                    type="button"
                    disabled={isDeleting}
                    className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                    title="Excluir mensagem"
                  />
                }>
                  <Trash2 className="w-3.5 h-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir esta mensagem?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ela some do conteúdo, mas continua marcada na linha do tempo como &quot;Mensagem excluída&quot;. Não pode ser desfeito por aqui.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {e.event_type === 'note_added' && (
          e.is_deleted ? (
            <p className="mt-1 text-sm text-muted-foreground italic">Mensagem excluída</p>
          ) : isEditing ? (
            <div className="mt-1.5 space-y-2">
              <RichTextEditor content={draft} onChange={setDraft} />
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={isSaving || isRichTextEmpty(draft)} onClick={handleSave} className="gap-1.5 h-7 text-xs">
                  {isSaving && <Spinner className="w-3 h-3" />}
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs">Cancelar</Button>
              </div>
            </div>
          ) : (
            e.note_text && (
              <div
                className="mt-1 bg-muted/60 rounded-lg px-3 py-2 text-sm text-foreground rich-text"
                dangerouslySetInnerHTML={{ __html: e.note_text }}
              />
            )
          )
        )}

        {!e.is_deleted && !isEditing && e.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {e.attachments.map((a) => (
              a.mime_type.startsWith('image/') ? (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt="Anexo" className="w-14 h-14 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                </a>
              ) : (
                <AttachmentFileChip key={a.id} url={a.url} fileName={a.file_name} mimeType={a.mime_type} />
              )
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-0.5">
          {new Date(e.created_at).toLocaleString('pt-BR')}
          {e.edited_at && !e.is_deleted && <span className="italic"> · (editada)</span>}
        </p>
      </div>
    </div>
  )
}
