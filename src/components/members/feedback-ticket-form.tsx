'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { submitFeedback, uploadFeedbackFile, uploadFeedbackAttachment } from '@/app/actions/feedback'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'
import { Bug, Lightbulb, Paperclip, X, Loader2, Link2, FileClock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { readDraft, writeDraft, clearDraft } from '@/lib/session-draft'
import { isRichTextEmpty } from '@/lib/rich-text-content'

type Attachment = { path: string; mimeType: string; sizeBytes: number; url: string; fileName: string }

type Draft = {
  type: 'bug' | 'suggestion'
  title: string
  message: string
  linkUrl: string
  attachments: Attachment[]
}

const DRAFT_KEY = 'feedback-new-ticket'

function isDraftWorthKeeping(d: Pick<Draft, 'title' | 'message' | 'attachments'>): boolean {
  return !!d.title.trim() || !isRichTextEmpty(d.message) || d.attachments.length > 0
}

export function FeedbackTicketForm() {
  const pathname = usePathname()
  const router = useRouter()
  const [type, setType] = useState<'bug' | 'suggestion'>('bug')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [draftRestored, setDraftRestored] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const skipNextSave = useRef(true)

  // Recupera rascunho da sessão do navegador (some ao fechar a aba) — só na
  // primeira montagem, pra não sobrescrever o que o usuário já digitou se o
  // componente remontar por outro motivo.
  useEffect(() => {
    const raw = readDraft(DRAFT_KEY)
    if (!raw) return
    try {
      const d = JSON.parse(raw) as Draft
      if (!isDraftWorthKeeping(d)) return
      setType(d.type ?? 'bug')
      setTitle(d.title ?? '')
      setMessage(d.message ?? '')
      setLinkUrl(d.linkUrl ?? '')
      setAttachments(d.attachments ?? [])
      // O RichTextEditor só lê `content` na montagem — trocar o state depois
      // não atualiza o editor já montado. Forçar remonte (via key) com o
      // texto restaurado já em `message` no momento do remonte.
      setEditorKey((k) => k + 1)
      setDraftRestored(true)
    } catch { /* rascunho corrompido, ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Salva a cada mudança — sessionStorage é local ao navegador, sem custo de
  // rede, então não precisa de debounce como as chamadas ao servidor.
  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return }
    const draft: Draft = { type, title, message, linkUrl, attachments }
    if (isDraftWorthKeeping(draft)) writeDraft(DRAFT_KEY, JSON.stringify(draft))
    else clearDraft(DRAFT_KEY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, title, message, linkUrl, attachments])

  function discardDraft() {
    clearDraft(DRAFT_KEY)
    setType('bug')
    setTitle('')
    setMessage('')
    setLinkUrl('')
    setAttachments([])
    setDraftRestored(false)
    setEditorKey((k) => k + 1) // mesmo motivo: força o editor a esvaziar de verdade
  }

  async function handleEditorImageUpload(file: File): Promise<string | null> {
    const r = await uploadFeedbackFile(file)
    if (r?.error) { toast.error(r.error); return null }
    return r.url ?? null
  }

  async function handleAttachmentPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setIsUploadingAttachment(true)
    try {
      for (const file of files) {
        // Um vídeo real facilmente passa de 10MB — o limite de body de Server
        // Action do Next (next.config.ts) derrubava a página antes mesmo do
        // arquivo chegar na validação de tipo do servidor. Mesmo fix já
        // aplicado em corrida-vendas-manager.tsx/famtours-manager.tsx.
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`"${file.name}" é grande demais (máx. 8MB). Vídeos não são aceitos aqui — envie imagem, PDF, Word, Excel ou texto.`)
          continue
        }
        const r = await uploadFeedbackAttachment(file)
        if (r?.error) toast.error(r.error)
        else if (r.url && r.path) {
          setAttachments((prev) => [...prev, { path: r.path!, mimeType: r.mimeType!, sizeBytes: r.sizeBytes!, url: r.url!, fileName: r.fileName! }])
        }
      }
    } catch {
      toast.error('Não foi possível enviar o anexo. Tente novamente com um arquivo menor.')
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  function removeAttachment(path: string) {
    setAttachments((prev) => prev.filter((a) => a.path !== path))
  }

  function handleSubmit() {
    if (!title.trim()) { toast.error('Dê um título para o chamado.'); return }
    const fd = new FormData()
    fd.set('type', type)
    fd.set('title', title)
    fd.set('message', message)
    fd.set('link_url', linkUrl)
    fd.set('page_url', pathname)
    fd.set('attachments', JSON.stringify(attachments.map((a) => ({ path: a.path, mimeType: a.mimeType, sizeBytes: a.sizeBytes, fileName: a.fileName }))))
    startTransition(async () => {
      const r = await submitFeedback(fd)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Chamado enviado. Obrigado!')
        clearDraft(DRAFT_KEY)
        setTitle('')
        setMessage('')
        setLinkUrl('')
        setAttachments([])
        setDraftRestored(false)
        setEditorKey((k) => k + 1)
        router.push(`${pathname}?tab=minhas`)
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-card border rounded-2xl p-5 md:p-6 space-y-5">
      {draftRestored && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <FileClock className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">Recuperamos o que você estava escrevendo antes de sair da página.</span>
          <button type="button" onClick={discardDraft} className="underline hover:text-amber-700 transition-colors shrink-0">
            Descartar
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('bug')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            type === 'bug' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <Bug className="w-4 h-4" />
          Bug
        </button>
        <button
          type="button"
          onClick={() => setType('suggestion')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            type === 'suggestion' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <Lightbulb className="w-4 h-4" />
          Sugestão
        </button>
      </div>

      <div>
        <Label htmlFor="feedback-title">Título</Label>
        <Input
          id="feedback-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumo do problema ou ideia"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Descrição</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Descreva com detalhes — você pode formatar o texto e inserir imagens direto aqui.</p>
        <RichTextEditor key={editorKey} content={message} onChange={setMessage} onImageUpload={handleEditorImageUpload} />
      </div>

      <div>
        <Label htmlFor="feedback-link" className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Link relacionado (opcional)
        </Label>
        <Input
          id="feedback-link"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          type="url"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Anexar arquivos (opcional)</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">Além das imagens inseridas no texto, você pode anexar fotos ou documentos separados — como prints, PDFs ou planilhas.</p>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a) => (
              a.mimeType.startsWith('image/') ? (
                <div key={a.path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt="Anexo" className="w-20 h-20 object-cover rounded-lg border border-border" />
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.path)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                    title="Remover anexo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <AttachmentFileChip
                  key={a.path}
                  url={a.url}
                  fileName={a.fileName}
                  mimeType={a.mimeType}
                  sizeBytes={a.sizeBytes}
                  onRemove={() => removeAttachment(a.path)}
                />
              )
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          multiple
          id="feedback-attach-input"
          className="hidden"
          onChange={handleAttachmentPick}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploadingAttachment}
          onClick={() => document.getElementById('feedback-attach-input')?.click()}
          className="gap-2"
        >
          {isUploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          {isUploadingAttachment ? 'Enviando...' : 'Anexar arquivo'}
        </Button>
      </div>

      <Button onClick={handleSubmit} disabled={isPending} className="w-full gap-2">
        {isPending && <Spinner className="w-4 h-4" />}
        {isPending ? 'Enviando...' : 'Enviar chamado'}
      </Button>
    </div>
  )
}
