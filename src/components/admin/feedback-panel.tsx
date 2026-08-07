'use client'

import { useState, useTransition, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { assignFeedback, updateFeedbackStatus, addFeedbackNote, uploadFeedbackFile, notifyMemberToRespond } from '@/app/actions/feedback'
import type { FeedbackReport, FeedbackStatus, AdminOption } from '@/app/actions/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { FeedbackTimeline } from '@/components/ui/feedback-timeline'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'
import { NoteAttachmentPicker, type PickedAttachment } from '@/components/ui/note-attachment-picker'
import { toast } from 'sonner'
import { Bug, Lightbulb, ChevronRight, Link2, ExternalLink, BellRing, LayoutGrid, List as ListIcon, Search, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { readDraft, writeDraft, clearDraft } from '@/lib/session-draft'
import { isRichTextEmpty } from '@/lib/rich-text-content'
import { formatTicketNumber } from '@/lib/feedback-ticket-number'

function draftKey(reportId: string) {
  return `feedback-admin-reply-${reportId}`
}

type StatusFilter = FeedbackStatus | 'all'
type ViewMode = 'kanban' | 'lista'
type SortKey = 'number' | 'lastAction'

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

const KANBAN_DOT_CLASS: Record<FeedbackStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-emerald-500',
}

const UNASSIGNED = '__unassigned__'

const isNoteEmpty = isRichTextEmpty

type WaitingInfo = { days: number; waitingOn: 'admin' | 'member' }

// Quem está devendo resposta e há quantos dias — só olha eventos que são de
// fato "turno de fala" (abertura ou resposta; atribuição/mudança de status
// não contam). `actor_name` é texto denormalizado (sem actor_id na tabela,
// ver CLAUDE.md) — comparar com member_name é a única forma de saber se foi
// o próprio membro ou o responsável quem respondeu por último; um admin com
// o mesmo nome do membro é o único caso que escaparia dessa heurística.
function computeWaitingInfo(report: FeedbackReport): WaitingInfo | null {
  if (report.status === 'resolved') return null
  const turnEvents = report.events.filter((e) => e.event_type === 'created' || e.event_type === 'note_added')
  const last = turnEvents[turnEvents.length - 1]
  const lastAt = last?.created_at ?? report.created_at
  const waitingOn: WaitingInfo['waitingOn'] =
    !last || last.event_type === 'created' || last.actor_name === report.member_name ? 'admin' : 'member'
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000))
  return { days, waitingOn }
}

function waitingLabel(info: WaitingInfo | null): string {
  if (!info) return ''
  const who = info.waitingOn === 'admin' ? 'Aguardando responsável' : 'Aguardando membro'
  return `${who} · ${info.days === 0 ? 'hoje' : `${info.days}d`}`
}

// Data da última ação = o evento mais recente da timeline (criação, atribuição,
// mudança de status ou resposta) — mais confiável que `resolved_at`, que fica
// desatualizado se o chamado for reaberto depois de finalizado.
function lastActionAt(report: FeedbackReport): string {
  const last = report.events[report.events.length - 1]
  return last?.created_at ?? report.created_at
}

async function handleEditorImageUpload(file: File): Promise<string | null> {
  const r = await uploadFeedbackFile(file)
  if (r?.error) { toast.error(r.error); return null }
  return r.url ?? null
}

function FeedbackKanban({ reports, onCardClick }: { reports: FeedbackReport[]; onCardClick: (id: string) => void }) {
  const columns = (['open', 'in_progress', 'resolved'] as const).map((status) => {
    const items = reports.filter((r) => r.status === status)
    // Coluna "Aberto" é uma fila de triagem: do primeiro que chegou pro
    // último, pra atender por ordem de chegada. `reports` já vem do servidor
    // ordenado por `created_at` desc (mais recente primeiro) — aqui só essa
    // coluna é invertida; Em andamento/Finalizado mantêm a ordem original.
    if (status === 'open') items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return { status, items }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {columns.map(({ status, items }) => (
        <div key={status} className="bg-muted/30 border border-border rounded-xl p-3 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', KANBAN_DOT_CLASS[status])} />
            <h3 className="text-sm font-semibold text-foreground">{STATUS_LABEL[status]}</h3>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum chamado aqui.</p>
            ) : (
              items.map((report) => {
                const waitingInfo = computeWaitingInfo(report)
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onCardClick(report.id)}
                    className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        report.type === 'bug' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                      )}>
                        {report.type === 'bug' ? <Bug className="w-2.5 h-2.5" /> : <Lightbulb className="w-2.5 h-2.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground tabular-nums">{formatTicketNumber(report.ticket_number)}</p>
                        <p className="text-sm font-medium text-foreground truncate">{report.title || 'Sem título'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{report.member_name || 'Membro'}</p>
                      </div>
                    </div>
                    {waitingInfo && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-2 text-[10px] whitespace-nowrap',
                          waitingInfo.days >= 3 ? 'text-red-500 border-red-500/40' : waitingInfo.days >= 1 ? 'text-amber-500 border-amber-500/40' : 'text-muted-foreground'
                        )}
                      >
                        {waitingLabel(waitingInfo)}
                      </Badge>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function FeedbackPanel({ reports, admins, initialOpenId = null }: { reports: FeedbackReport[]; admins: AdminOption[]; initialOpenId?: string | null }) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('kanban')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [search, setSearch] = useState('')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastAction')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [noteAttachments, setNoteAttachments] = useState<Record<string, PickedAttachment[]>>({})
  const [noteResetKey, setNoteResetKey] = useState<Record<string, number>>({})
  const [isPending, startSave] = useTransition()
  const [lightbox, setLightbox] = useState<{ reportId: string; index: number } | null>(null)
  // Rastreia qual campo específico está salvando, pra mostrar o spinner só
  // nele — `isPending` sozinho não diferencia (é compartilhado por status,
  // responsável, notificar e responder), então mudar o status também
  // "acendia" a aparência de carregando no botão de notificar, por exemplo.
  const [activeAction, setActiveAction] = useState<{ id: string; kind: 'status' | 'assign' } | null>(null)

  // Recupera rascunhos de resposta da sessão do navegador — só uma vez, pra
  // não sobrescrever o que o admin já está digitando se `reports` mudar
  // (ex.: depois de um router.refresh()).
  const restoredDraftsRef = useRef(false)
  useEffect(() => {
    if (restoredDraftsRef.current) return
    restoredDraftsRef.current = true
    const found: Record<string, string> = {}
    const keysToBump: Record<string, number> = {}
    reports.forEach((r) => {
      const draft = readDraft(draftKey(r.id))
      if (draft && !isNoteEmpty(draft)) { found[r.id] = draft; keysToBump[r.id] = 1 }
    })
    if (Object.keys(found).length > 0) {
      setNotes((p) => ({ ...p, ...found }))
      // O RichTextEditor só lê `content` na montagem — sem bumpar a key
      // específica deste report, o texto restaurado fica no state mas nunca
      // aparece no editor já montado.
      setNoteResetKey((p) => ({ ...p, ...keysToBump }))
    }
  }, [reports])

  function handleNoteChange(reportId: string, html: string) {
    setNotes((p) => ({ ...p, [reportId]: html }))
    if (isNoteEmpty(html)) clearDraft(draftKey(reportId))
    else writeDraft(draftKey(reportId), html)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'number' ? 'desc' : 'desc') }
  }

  const openCount = reports.filter((r) => r.status === 'open').length

  // Lista de usuários que já abriram chamado, pro filtro — sempre a partir de
  // TODOS os reports (não dos já filtrados), senão a opção escolhida some do
  // seletor assim que ela mesma filtra a lista.
  const memberOptions = useMemo(() => {
    const names = new Set(reports.map((r) => r.member_name).filter(Boolean))
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [reports])

  // Pesquisa + usuário + período — comum às duas visões (Kanban e Lista).
  // Mantém o card aberto visível mesmo se ele deixar de bater com o filtro
  // atual — senão o chamado some da tela no meio da edição do admin.
  const baseFiltered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
    return reports.filter((r) => {
      if (r.id === openId) return true
      if (term) {
        const ticketStr = formatTicketNumber(r.ticket_number).toLowerCase()
        const matches = ticketStr.includes(term) || (r.title || '').toLowerCase().includes(term) || (r.member_name || '').toLowerCase().includes(term)
        if (!matches) return false
      }
      if (userFilter !== 'all' && r.member_name !== userFilter) return false
      const createdAt = new Date(r.created_at).getTime()
      if (from !== null && createdAt < from) return false
      if (to !== null && createdAt > to) return false
      return true
    })
  }, [reports, search, userFilter, dateFrom, dateTo, openId])

  // Status (só existe na Lista — no Kanban as 3 colunas já particionam) + ordenação.
  const visibleReports = useMemo(() => {
    const statusFiltered = baseFiltered.filter((r) => statusFilter === 'all' || r.status === statusFilter || r.id === openId)
    return [...statusFiltered].sort((a, b) => {
      const cmp = sortKey === 'number'
        ? a.ticket_number - b.ticket_number
        : new Date(lastActionAt(a)).getTime() - new Date(lastActionAt(b)).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [baseFiltered, statusFilter, sortKey, sortDir])

  function handleStatusChange(id: string, status: FeedbackStatus) {
    setActiveAction({ id, kind: 'status' })
    startSave(async () => {
      const r = await updateFeedbackStatus(id, status)
      setActiveAction(null)
      if (r?.error) toast.error(r.error)
      else { toast.success(`Status alterado para "${STATUS_LABEL[status]}".`); router.refresh() }
    })
  }

  function handleAssign(id: string, assignedTo: string) {
    setActiveAction({ id, kind: 'assign' })
    startSave(async () => {
      const r = await assignFeedback(id, assignedTo === UNASSIGNED ? null : assignedTo)
      setActiveAction(null)
      if (r?.error) toast.error(r.error)
      else { toast.success('Responsável atualizado!'); router.refresh() }
    })
  }

  function handleNotifyMember(id: string) {
    startSave(async () => {
      const r = await notifyMemberToRespond(id)
      if (r?.error) toast.error(r.error)
      else toast.success('Membro notificado!')
    })
  }

  function handleSaveNote(id: string) {
    const note = notes[id] ?? ''
    const attachments = (noteAttachments[id] ?? []).map((a) => ({ path: a.path, mimeType: a.mimeType, sizeBytes: a.sizeBytes, fileName: a.fileName }))
    startSave(async () => {
      const r = await addFeedbackNote(id, note, attachments)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Resposta enviada! O membro foi notificado.')
        clearDraft(draftKey(id))
        setNotes((p) => ({ ...p, [id]: '' }))
        setNoteAttachments((p) => ({ ...p, [id]: [] }))
        setNoteResetKey((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
        router.refresh()
      }
    })
  }

  function renderDetail(report: FeedbackReport) {
    return (
      <div className="space-y-4">
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
            {report.attachments.map((a) => {
              const isImage = a.mime_type.startsWith('image/')
              const imageIndex = isImage
                ? report.attachments.filter((x) => x.mime_type.startsWith('image/')).findIndex((x) => x.id === a.id)
                : -1
              return isImage ? (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setLightbox({ reportId: report.id, index: imageIndex })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt="Anexo" className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                </button>
              ) : (
                <AttachmentFileChip key={a.id} url={a.url} fileName={a.file_name} mimeType={a.mime_type} />
              )
            })}
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
              disabled={isPending}
            >
              <SelectTrigger className="h-8 text-sm">
                {activeAction?.id === report.id && activeAction.kind === 'status' ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </span>
                ) : (
                  <SelectValue>{(v: FeedbackStatus) => STATUS_LABEL[v]}</SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress" disabled={!report.assigned_to}>Em andamento</SelectItem>
                <SelectItem value="resolved" disabled={!report.assigned_to}>Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Responsável:</span>
            <Select
              value={report.assigned_to ?? UNASSIGNED}
              onValueChange={(v) => handleAssign(report.id, v as string)}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 text-sm">
                {activeAction?.id === report.id && activeAction.kind === 'assign' ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </span>
                ) : (
                  <SelectValue>
                    {(v: string) => v === UNASSIGNED ? 'Ninguém' : (admins.find((a) => a.id === v)?.full_name ?? '')}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED} disabled={report.status !== 'open'}>Ninguém</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {report.status !== 'resolved' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleNotifyMember(report.id)}
              className="gap-1.5 h-8 text-xs"
              title="Envia uma notificação lembrando o membro de responder este chamado"
            >
              <BellRing className="w-3.5 h-3.5" />
              Notificar membro
            </Button>
          )}
        </div>

        <FeedbackTimeline events={report.events} reportId={report.id} canModerate />

        <div className="space-y-2">
          <RichTextEditor
            key={`note-${report.id}-${noteResetKey[report.id] ?? 0}`}
            content={notes[report.id] ?? ''}
            onChange={(v) => handleNoteChange(report.id, v)}
            onImageUpload={handleEditorImageUpload}
          />
          <NoteAttachmentPicker
            attachments={noteAttachments[report.id] ?? []}
            onChange={(next) => setNoteAttachments((p) => ({ ...p, [report.id]: next }))}
            idSuffix={`admin-${report.id}`}
          />
        </div>

        <Button
          size="sm"
          disabled={isPending || isNoteEmpty(notes[report.id] ?? '')}
          onClick={() => handleSaveNote(report.id)}
        >
          Enviar resposta
        </Button>
      </div>
    )
  }

  const openReport = reports.find((r) => r.id === openId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView('lista')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'lista' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListIcon className="w-4 h-4" />
            Lista
          </button>
        </div>

      </div>

      {/* Pesquisa + usuário + período — vale pras duas visões (Kanban e Lista) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar chamado..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Todos os usuários</option>
          {memberOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={cn(
              'h-9 text-sm border rounded-lg px-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30',
              dateFrom ? 'border-primary text-primary font-medium' : 'border-border text-muted-foreground',
            )}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn(
              'h-9 text-sm border rounded-lg px-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30',
              dateTo ? 'border-primary text-primary font-medium' : 'border-border text-muted-foreground',
            )}
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              title="Limpar período"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {view === 'lista' && (
        <div className="flex flex-wrap gap-2">
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
      )}

      {view === 'kanban' ? (
        <FeedbackKanban reports={baseFiltered} onCardClick={setOpenId} />
      ) : visibleReports.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhum feedback encontrado.
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('number')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Número
                    {sortKey === 'number' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 font-medium">Assunto</th>
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">
                  <button type="button" onClick={() => toggleSort('lastAction')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Data da última ação
                    {sortKey === 'lastAction' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Justificativa</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleReports.map((report) => {
                const waitingInfo = computeWaitingInfo(report)
                return (
                  <tr
                    key={report.id}
                    onClick={() => setOpenId(report.id)}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors',
                      openId === report.id && 'bg-primary/5'
                    )}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                          report.type === 'bug' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                        )}>
                          {report.type === 'bug' ? <Bug className="w-2.5 h-2.5" /> : <Lightbulb className="w-2.5 h-2.5" />}
                        </div>
                        <span className="text-muted-foreground tabular-nums whitespace-nowrap">{formatTicketNumber(report.ticket_number)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top max-w-xs">
                      <p className="font-medium text-foreground truncate">{report.title || 'Sem título'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {report.member_name || 'Membro'}
                        {report.assigned_name && ` · Responsável: ${report.assigned_name}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground whitespace-nowrap">
                      {new Date(lastActionAt(report)).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge className={STATUS_BADGE_CLASS[report.status]}>{STATUS_LABEL[report.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {waitingInfo && (
                        <span className={cn(
                          'text-xs whitespace-nowrap',
                          waitingInfo.days >= 3 ? 'text-red-500' : waitingInfo.days >= 1 ? 'text-amber-500' : 'text-muted-foreground'
                        )}>
                          {waitingLabel(waitingInfo)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openReport !== null} onOpenChange={(v) => { if (!v) setOpenId(null) }}>
        <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-3xl">
          {openReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    openReport.type === 'bug' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {openReport.type === 'bug' ? <Bug className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-muted-foreground font-normal tabular-nums">{formatTicketNumber(openReport.ticket_number)}</span>
                  <span className="truncate">{openReport.title || 'Sem título'}</span>
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{openReport.member_name || 'Membro'}</span>
                  <span>·</span>
                  <span>aberto em {new Date(openReport.created_at).toLocaleDateString('pt-BR')}</span>
                  <Badge className={STATUS_BADGE_CLASS[openReport.status]}>{STATUS_LABEL[openReport.status]}</Badge>
                </div>
              </DialogHeader>
              <Separator />
              <div className="overflow-y-auto pr-1 -mr-1">
                {renderDetail(openReport)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {lightbox && (() => {
        const report = reports.find((r) => r.id === lightbox.reportId)
        if (!report) return null
        const images = report.attachments.filter((a) => a.mime_type.startsWith('image/'))
        return (
          <ImageLightbox
            images={images}
            index={lightbox.index}
            onClose={() => setLightbox(null)}
            onNavigate={(index) => setLightbox({ reportId: lightbox.reportId, index })}
          />
        )
      })()}
    </div>
  )
}
