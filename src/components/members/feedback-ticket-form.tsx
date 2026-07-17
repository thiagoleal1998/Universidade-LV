'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { submitFeedback, uploadFeedbackFile } from '@/app/actions/feedback'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Bug, Lightbulb, Paperclip, X, Loader2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Attachment = { path: string; mimeType: string; sizeBytes: number; url: string }

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
    for (const file of files) {
      const r = await uploadFeedbackFile(file)
      if (r?.error) toast.error(r.error)
      else if (r.url && r.path) {
        setAttachments((prev) => [...prev, { path: r.path!, mimeType: r.mimeType!, sizeBytes: r.sizeBytes!, url: r.url! }])
      }
    }
    setIsUploadingAttachment(false)
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
    fd.set('attachments', JSON.stringify(attachments.map((a) => ({ path: a.path, mimeType: a.mimeType, sizeBytes: a.sizeBytes }))))
    startTransition(async () => {
      const r = await submitFeedback(fd)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Chamado enviado. Obrigado!')
        setTitle('')
        setMessage('')
        setLinkUrl('')
        setAttachments([])
        router.push('/dashboard/feedback?tab=minhas')
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-card border rounded-2xl p-5 md:p-6 space-y-5">
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
        <RichTextEditor content={message} onChange={setMessage} onImageUpload={handleEditorImageUpload} />
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
        <Label>Anexar fotos (opcional)</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">Além das imagens inseridas no texto, você pode anexar fotos separadas — como prints do problema.</p>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a) => (
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
            ))}
          </div>
        )}

        <input
          type="file"
          accept="image/*"
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
          {isUploadingAttachment ? 'Enviando...' : 'Anexar foto'}
        </Button>
      </div>

      <Button onClick={handleSubmit} disabled={isPending} className="w-full gap-2">
        {isPending && <Spinner className="w-4 h-4" />}
        {isPending ? 'Enviando...' : 'Enviar chamado'}
      </Button>
    </div>
  )
}
