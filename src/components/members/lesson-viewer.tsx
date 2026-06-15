'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { toggleLessonComplete } from '@/app/actions/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Circle, Download, FileText, FileSpreadsheet, FileImage, File, Paperclip } from 'lucide-react'
import { toast } from 'sonner'

type Photo = { id: string; url: string; caption: string }
type Attachment = { id: string; name: string; url: string; size_bytes: number; mime_type: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="w-4 h-4 text-blue-500" />
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />
  if (mime.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-muted-foreground" />
}

interface LessonViewerProps {
  lessonId: string
  embedUrl: string | null
  contentText: string | null
  photos: Photo[]
  attachments?: Attachment[]
  isCompleted: boolean
}

export function LessonViewer({ lessonId, embedUrl, contentText, photos, attachments = [], isCompleted: initialCompleted }: LessonViewerProps) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const next = !completed
      const result = await toggleLessonComplete(lessonId, next)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setCompleted(next)
        toast.success(next ? 'Aula marcada como concluída!' : 'Marcação removida.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Vídeo YouTube */}
      {embedUrl && (
        <div className="rounded-xl overflow-hidden bg-black aspect-video">
          <iframe
            src={embedUrl}
            title="Vídeo da aula"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Conteúdo textual */}
      {contentText && (
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: contentText }}
        />
      )}

      {/* Galeria de Fotos */}
      {photos.length > 0 && (
        <div>
          <Separator className="mb-6" />
          <h3 className="font-semibold text-foreground mb-4">Galeria de Fotos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {photos.map((photo) => (
              <figure key={photo.id} className="rounded-lg overflow-hidden border">
                <Image
                  src={photo.url}
                  alt={photo.caption || 'Foto da aula'}
                  width={600}
                  height={400}
                  className="w-full object-cover"
                />
                {photo.caption && (
                  <figcaption className="text-xs text-muted-foreground px-3 py-2">{photo.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* Anexos para Download */}
      {attachments.length > 0 && (
        <div>
          <Separator className="mb-6" />
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            Materiais de Apoio
          </h3>
          <div className="space-y-2">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                download={att.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors group"
              >
                <AttachmentIcon mime={att.mime_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(att.size_bytes)}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Botão de conclusão */}
      <div className="flex justify-end">
        <Button
          variant={completed ? 'default' : 'outline'}
          onClick={handleToggle}
          disabled={isPending}
          className="gap-2"
        >
          {completed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Concluída
            </>
          ) : (
            <>
              <Circle className="w-4 h-4" />
              Marcar como concluída
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
