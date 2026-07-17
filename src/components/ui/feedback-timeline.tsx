import type { FeedbackEvent } from '@/app/actions/feedback'
import { PlusCircle, UserCog, ArrowRightCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

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
                <div className="mt-1 bg-muted/60 rounded-lg px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                  {e.note_text}
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
