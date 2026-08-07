'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackReport, FeedbackStatus } from '@/app/actions/feedback'
import { addFeedbackNote, uploadFeedbackFile } from '@/app/actions/feedback'
import { getUnreadFeedbackUpdateReportIds, markFeedbackReportNotificationRead } from '@/app/actions/notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { FeedbackTimeline } from '@/components/ui/feedback-timeline'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'
import { NoteAttachmentPicker, type PickedAttachment } from '@/components/ui/note-attachment-picker'
import { Bug, Lightbulb, ChevronRight, Link2, ExternalLink, Sparkles, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { readDraft, writeDraft, clearDraft } from '@/lib/session-draft'
import { isRichTextEmpty } from '@/lib/rich-text-content'
import { formatTicketNumber } from '@/lib/feedback-ticket-number'

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

type StatusFilter = FeedbackStatus | 'all'

const isNoteEmpty = isRichTextEmpty

function draftKey(reportId: string) {
  return `feedback-member-reply-${reportId}`
}

async function handleEditorImageUpload(file: File): Promise<string | null> {
  const r = await uploadFeedbackFile(file)
  if (r?.error) { toast.error(r.error); return null }
  return r.url ?? null
}

export function MyFeedbackList({ reports, initialOpenId = null }: { reports: FeedbackReport[]; initialOpenId?: string | null }) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(initialOpenId)
  const [lightbox, setLightbox] = useState<{ reportId: string; index: number } | null>(null)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [replyAttachments, setReplyAttachments] = useState<Record<string, PickedAttachment[]>>({})
  const [replyResetKey, setReplyResetKey] = useState<Record<string, number>>({})
  const [isSending, startSend] = useTransition()
  const [unreadReportIds, setUnreadReportIds] = useState<Set<string>>(new Set())
  // Mesmo filtro do painel admin (busca + status), sem o filtro de usuário —
  // aqui só existe UM usuário possível: o próprio dono da lista.
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')

  useEffect(() => {
    getUnreadFeedbackUpdateReportIds().then((ids) => setUnreadReportIds(new Set(ids)))
  }, [])

  // Vindo de uma notificação (link com ?report=<id>) — o modal abre sozinho
  // por reagir a `openReport !== null` (initialOpenId), sem precisar de
  // scroll manual como antes (o Dialog cobre a tela, não tem pra onde rolar).
  // Mas `useState(initialOpenId)` só lê a prop na MONTAGEM — clicar numa
  // notificação nova com esta página já aberta (mesma rota, só troca
  // `?report=`) não remonta o componente, então sem o useEffect abaixo o
  // modal nunca abria (bug real, relatado pelo Cesar: clique navegava,
  // loading aparecia, mas ficava na mesma tela).
  useEffect(() => {
    if (initialOpenId) setOpenId(initialOpenId)
  }, [initialOpenId])

  // Recupera rascunhos de resposta da sessão do navegador — só uma vez, pra
  // não sobrescrever o que o membro já está digitando se `reports` mudar.
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
      setReplies((p) => ({ ...p, ...found }))
      // O RichTextEditor só lê `content` na montagem — sem bumpar a key
      // específica deste report, o texto restaurado fica no state mas nunca
      // aparece no editor já montado.
      setReplyResetKey((p) => ({ ...p, ...keysToBump }))
    }
  }, [reports])

  function handleReplyChange(reportId: string, html: string) {
    setReplies((p) => ({ ...p, [reportId]: html }))
    if (isNoteEmpty(html)) clearDraft(draftKey(reportId))
    else writeDraft(draftKey(reportId), html)
  }

  function openReportDialog(id: string) {
    setOpenId(id)
    if (unreadReportIds.has(id)) {
      setUnreadReportIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      markFeedbackReportNotificationRead(id)
    }
  }

  function handleSendReply(id: string) {
    const note = replies[id] ?? ''
    const attachments = (replyAttachments[id] ?? []).map((a) => ({ path: a.path, mimeType: a.mimeType, sizeBytes: a.sizeBytes, fileName: a.fileName }))
    startSend(async () => {
      const r = await addFeedbackNote(id, note, attachments)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Resposta enviada!')
        clearDraft(draftKey(id))
        setReplies((p) => ({ ...p, [id]: '' }))
        setReplyAttachments((p) => ({ ...p, [id]: [] }))
        setReplyResetKey((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
        router.refresh()
      }
    })
  }

  function renderDetail(report: FeedbackReport) {
    return (
      <div className="space-y-4">
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

        <FeedbackTimeline events={report.events} />

        <div className="space-y-2">
          <RichTextEditor
            key={`reply-${report.id}-${replyResetKey[report.id] ?? 0}`}
            content={replies[report.id] ?? ''}
            onChange={(v) => handleReplyChange(report.id, v)}
            onImageUpload={handleEditorImageUpload}
          />
          <NoteAttachmentPicker
            attachments={replyAttachments[report.id] ?? []}
            onChange={(next) => setReplyAttachments((p) => ({ ...p, [report.id]: next }))}
            idSuffix={`member-${report.id}`}
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
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground bg-card border rounded-2xl">
        Você ainda não abriu nenhum chamado.
      </div>
    )
  }

  const openReport = reports.find((r) => r.id === openId) ?? null
  const openCount = reports.filter((r) => r.status === 'open').length

  // Busca + período, igual ao painel admin — mantém o chamado aberto no modal
  // sempre visível mesmo se deixar de bater com o filtro atual.
  const term = search.trim().toLowerCase()
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
  const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
  const filteredReports = reports.filter((r) => {
    if (r.id === openId) return true
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (term) {
      const ticketStr = formatTicketNumber(r.ticket_number).toLowerCase()
      const matches = ticketStr.includes(term) || (r.title || '').toLowerCase().includes(term)
      if (!matches) return false
    }
    const createdAt = new Date(r.created_at).getTime()
    if (from !== null && createdAt < from) return false
    if (to !== null && createdAt > to) return false
    return true
  })

  function renderCard(report: FeedbackReport) {
    const hasUpdate = unreadReportIds.has(report.id)
    return (
      <button
        key={report.id}
        type="button"
        onClick={() => openReportDialog(report.id)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3 bg-card border rounded-xl hover:bg-muted/40 transition-colors text-left',
          hasUpdate && 'border-primary/40'
        )}
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
              <span className="text-muted-foreground font-normal tabular-nums shrink-0">{formatTicketNumber(report.ticket_number)}</span>
              <span className="truncate">· {report.title || 'Sem título'}</span>
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
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Busca + período */}
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

      {/* Filtro por status */}
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

      {filteredReports.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground bg-card border rounded-2xl">
          Nenhum chamado encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(renderCard)}
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
                  <span>aberto em {new Date(openReport.created_at).toLocaleDateString('pt-BR')}</span>
                  {openReport.assigned_name && <span>· Responsável: {openReport.assigned_name}</span>}
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
