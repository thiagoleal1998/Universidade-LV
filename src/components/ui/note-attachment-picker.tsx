'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AttachmentFileChip } from '@/components/ui/attachment-file-chip'
import { uploadFeedbackAttachment } from '@/app/actions/feedback'
import { Paperclip, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

export type PickedAttachment = { path: string; mimeType: string; sizeBytes: number; url: string; fileName: string }

// Picker de anexo (foto ou documento) para uma resposta de chamado — usado
// tanto pelo admin (feedback-panel.tsx) quanto pelo membro (my-feedback-list.tsx),
// mesmo padrão do feedback-ticket-form.tsx (abertura do chamado).
export function NoteAttachmentPicker({
  attachments, onChange, idSuffix,
}: {
  attachments: PickedAttachment[]
  onChange: (next: PickedAttachment[]) => void
  idSuffix: string
}) {
  const [isUploading, setIsUploading] = useState(false)
  const inputId = `note-attach-${idSuffix}`

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setIsUploading(true)
    let next = attachments
    for (const file of files) {
      const r = await uploadFeedbackAttachment(file)
      if (r?.error) toast.error(r.error)
      else if (r.url && r.path) {
        next = [...next, { path: r.path!, mimeType: r.mimeType!, sizeBytes: r.sizeBytes!, url: r.url!, fileName: r.fileName! }]
        onChange(next)
      }
    }
    setIsUploading(false)
  }

  function remove(path: string) {
    onChange(attachments.filter((a) => a.path !== path))
  }

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            a.mimeType.startsWith('image/') ? (
              <div key={a.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="Anexo" className="w-16 h-16 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => remove(a.path)}
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
                onRemove={() => remove(a.path)}
              />
            )
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        multiple
        id={inputId}
        className="hidden"
        onChange={handlePick}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => document.getElementById(inputId)?.click()}
        className="gap-2"
      >
        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        {isUploading ? 'Enviando...' : 'Anexar arquivo'}
      </Button>
    </div>
  )
}
