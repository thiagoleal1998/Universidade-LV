'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementPublished } from '@/app/actions/announcements'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, X, Check, Clock, CalendarX } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Announcement = {
  id: string
  title: string
  body: string
  is_published: boolean
  publish_at: string | null
  expires_at: string | null
  created_at: string
}

function RichTextArea({
  name,
  defaultValue = '',
  placeholder,
  rows = 4,
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  rows?: number
}) {
  const [value, setValue] = useState(defaultValue)
  const ref = useRef<HTMLTextAreaElement>(null)

  function applyFormat(tag: string) {
    const ta = ref.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const open = `<${tag}>`
    const close = `</${tag}>`
    const newVal = value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end)
    setValue(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + open.length, end + open.length)
    })
  }

  return (
    <div>
      <div className="flex gap-1 px-1.5 py-1 border border-border border-b-0 rounded-t-md bg-muted/30">
        <button
          type="button"
          title="Negrito"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('strong') }}
          className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold hover:bg-muted transition-colors"
        >
          B
        </button>
        <button
          type="button"
          title="Itálico"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('em') }}
          className="w-7 h-7 flex items-center justify-center rounded text-sm italic hover:bg-muted transition-colors"
        >
          I
        </button>
        <button
          type="button"
          title="Sublinhado"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('u') }}
          className="w-7 h-7 flex items-center justify-center rounded text-sm underline hover:bg-muted transition-colors"
        >
          U
        </button>
      </div>
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required
        className="flex w-full rounded-b-md rounded-t-none border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
    </div>
  )
}

function AnnouncementForm({
  onSubmit,
  isPending,
  defaultValues,
  onCancel,
}: {
  onSubmit: (formData: FormData) => void
  isPending: boolean
  defaultValues?: { title: string; body: string; publish_at?: string | null; expires_at?: string | null }
  onCancel?: () => void
}) {
  const [showSchedule, setShowSchedule] = useState(!!defaultValues?.publish_at)
  const [showExpiry, setShowExpiry] = useState(!!defaultValues?.expires_at)

  const defaultDatetime = defaultValues?.publish_at
    ? new Date(defaultValues.publish_at).toISOString().slice(0, 16)
    : ''

  const defaultExpiry = defaultValues?.expires_at
    ? new Date(defaultValues.expires_at).toISOString().slice(0, 16)
    : ''

  return (
    <form action={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input name="title" defaultValue={defaultValues?.title} placeholder="Título do comunicado" required />
      </div>
      <div className="space-y-1.5">
        <Label>Mensagem</Label>
        <RichTextArea name="body" defaultValue={defaultValues?.body} placeholder="Escreva a mensagem..." rows={4} />
      </div>

      {/* Agendamento de publicação */}
      {showSchedule && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Publicar em
          </Label>
          <DateTimePicker
            name="publish_at"
            defaultValue={defaultDatetime}
            min={new Date().toISOString().slice(0, 16)}
            placeholder="Selecionar data de publicação"
          />
          <p className="text-xs text-muted-foreground">
            O comunicado aparecerá automaticamente na data/hora definida.
          </p>
        </div>
      )}

      {/* Expiração */}
      {showExpiry && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarX className="w-3.5 h-3.5" />
            Expirar em
          </Label>
          <DateTimePicker
            name="expires_at"
            defaultValue={defaultExpiry}
            min={new Date().toISOString().slice(0, 16)}
            placeholder="Selecionar data de expiração"
          />
          <p className="text-xs text-muted-foreground">
            O comunicado será removido automaticamente na data/hora definida.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? <><Spinner className="w-4 h-4" /> Salvando...</>
            : defaultValues ? 'Salvar' : <><Plus className="w-4 h-4 mr-1" />Criar</>
          }
        </Button>

        {!showSchedule && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowSchedule(true)} className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Agendar
          </Button>
        )}
        {showSchedule && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowSchedule(false)} className="gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Remover agendamento
          </Button>
        )}

        {!showExpiry && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowExpiry(true)} className="gap-1.5">
            <CalendarX className="w-3.5 h-3.5" />
            Definir expiração
          </Button>
        )}
        {showExpiry && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowExpiry(false)} className="gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Remover expiração
          </Button>
        )}

        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AnnouncementRow({ ann, isAdmin = true }: { ann: Announcement; isAdmin?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const now = new Date()
  const isScheduled   = !ann.is_published && ann.publish_at && new Date(ann.publish_at) > now
  const isAutoPublished = !ann.is_published && ann.publish_at && new Date(ann.publish_at) <= now
  const isExpired     = ann.expires_at && new Date(ann.expires_at) <= now
  const willExpire    = ann.expires_at && new Date(ann.expires_at) > now

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      formData.set('is_published', String(ann.is_published))
      const result = await updateAnnouncement(ann.id, formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('Comunicado atualizado!'); setEditing(false); router.refresh() }
    })
  }

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAnnouncementPublished(ann.id, !ann.is_published)
      if (result?.error) toast.error(result.error)
      else { toast.success(ann.is_published ? 'Comunicado despublicado.' : 'Comunicado publicado!'); router.refresh() }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAnnouncement(ann.id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Comunicado excluído.'); router.refresh() }
    })
  }

  if (editing) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <AnnouncementForm
          onSubmit={handleUpdate}
          isPending={isPending}
          defaultValues={{ title: ann.title, body: ann.body, publish_at: ann.publish_at, expires_at: ann.expires_at }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className={cn('bg-card border rounded-lg px-5 py-4', !ann.is_published && !isAutoPublished && 'opacity-70')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-foreground">{ann.title}</span>

            {/* Status de publicação */}
            {ann.is_published || isAutoPublished ? (
              <Badge variant="default">Publicado</Badge>
            ) : isScheduled ? (
              <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1">
                <Clock className="w-3 h-3" />
                Agendado · {formatDate(ann.publish_at!)}
              </Badge>
            ) : (
              <Badge variant="secondary">Rascunho</Badge>
            )}

            {/* Status de expiração */}
            {isExpired && (
              <Badge variant="outline" className="text-red-500 border-red-400 gap-1">
                <CalendarX className="w-3 h-3" />
                Expirado
              </Badge>
            )}
            {willExpire && (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <CalendarX className="w-3 h-3" />
                Expira · {formatDate(ann.expires_at!)}
              </Badge>
            )}
          </div>

          <div
            className="text-sm text-muted-foreground whitespace-pre-wrap [&_strong]:font-bold [&_em]:italic [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: ann.body }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              title={ann.is_published ? 'Despublicar' : 'Publicar agora'}
              disabled={isPending}
              onClick={handleToggle}
            >
              <Check className={cn('w-4 h-4', ann.is_published ? 'text-green-600' : 'text-muted-foreground')} />
            </Button>
            <Button variant="ghost" size="icon" disabled={isPending} onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" />}>
                <Trash2 className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir comunicado?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
    </div>
  )
}

export function AnnouncementsManager({ announcements, isAdmin = true }: { announcements: Announcement[]; isAdmin?: boolean }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isCreating, startCreate] = useTransition()

  function handleCreate(formData: FormData) {
    startCreate(async () => {
      const result = await createAnnouncement(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('Comunicado criado!'); setShowForm(false); router.refresh() }
    })
  }

  return (
    <div className="space-y-4">
      {isAdmin && !showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Comunicado
        </Button>
      )}

      {isAdmin && showForm && (
        <div className="bg-muted/40 border border-dashed rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">Novo Comunicado</p>
          <AnnouncementForm
            onSubmit={handleCreate}
            isPending={isCreating}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {announcements.length === 0 && !showForm && (
        <p className="text-muted-foreground text-center py-12">
          Nenhum comunicado criado ainda.
        </p>
      )}

      {announcements.map((ann) => (
        <AnnouncementRow key={ann.id} ann={ann} isAdmin={isAdmin} />
      ))}
    </div>
  )
}
