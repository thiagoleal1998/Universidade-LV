import type { FeedbackEvent } from '@/app/actions/feedback'
import { PlusCircle, UserCog, ArrowRightCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'

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

export function FeedbackTimeline({ events }: { events: FeedbackEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Linha do tempo</p>
      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className="flex gap-2.5">
            <EventIcon type={e.event_type} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-foreground">{eventText(e)}</p>
              {e.event_type === 'note_added' && e.note_text && (
                <div
                  className="mt-1 bg-muted/60 rounded-lg px-3 py-2 text-sm text-foreground rich-text"
                  dangerouslySetInnerHTML={{ __html: e.note_text }}
                />
              )}
              {e.attachments.length > 0 && (
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
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
