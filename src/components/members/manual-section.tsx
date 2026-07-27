'use client'

import { useState, useTransition } from 'react'
import { toggleLessonComplete } from '@/app/actions/progress'
import { LessonTaskForm } from '@/components/members/lesson-task-form'
import { LessonComments } from '@/components/members/lesson-comments'
import { StudyVideoPlayer } from '@/components/members/study-video-player'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, MessageCircle, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { manualSectionId } from '@/lib/manual'
import type { LessonTask, TaskResponse } from '@/app/actions/lesson-tasks'

// Mesma função de study-interface.tsx, duplicada aqui (função pequena e
// pura) em vez de exportada de lá — evita mexer num arquivo do formato
// clássico que a regra do projeto é não tocar.
function getSheetEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsMatch) {
    const gsId = gsMatch[1]
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `?gid=${gidMatch[1]}` : ''
    return `https://docs.google.com/spreadsheets/d/${gsId}/htmlview${gid}`
  }
  if (url.includes('sharepoint.com') || url.includes('office.com') || url.includes('onedrive.live.com')) {
    return url.includes('action=embedview') ? url : `${url}&action=embedview`
  }
  return null
}

// Mesmo shape local usado em study-interface.tsx — não é exportado de
// lesson-comments.tsx, então duplicar aqui segue o mesmo precedente.
type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  parent_id: string | null
  is_pinned: boolean
  is_hidden: boolean
  profiles: { full_name: string } | null
}

export type ManualSectionData = {
  id: string
  title: string
  description: string | null
  contentText: string | null
  searchText: string
  embedUrl: string | null
  videoId: string | null
  photos: { id: string; url: string; caption: string }[]
  attachments: { id: string; name: string; url: string; size_bytes: number; mime_type: string }[]
  sheetUrl: string | null
  task: LessonTask | null
  myTaskResponse: TaskResponse | null
  taskStartDate: string | null
  taskEndDate: string | null
  comments: Comment[]
  isDraft: boolean
}

export function ManualSection({
  section,
  moduleId,
  isCompleted,
  onToggleComplete,
  currentUserId,
  isAdmin,
  canModerate,
}: {
  section: ManualSectionData
  moduleId: string
  isCompleted: boolean
  onToggleComplete: (lessonId: string, completed: boolean) => void
  currentUserId: string
  isAdmin: boolean
  canModerate: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [commentsOpen, setCommentsOpen] = useState(false)

  function handleToggle() {
    const next = !isCompleted
    onToggleComplete(section.id, next) // otimista, o ModuleManual já atualiza a UI
    startTransition(async () => {
      const r = await toggleLessonComplete(section.id, next, moduleId)
      if (r?.error) {
        toast.error(r.error)
        onToggleComplete(section.id, !next) // desfaz o otimismo se falhar
      }
    })
  }

  return (
    <section
      id={manualSectionId(section.id)}
      data-manual-section
      className="scroll-mt-20 pb-10 mb-10 border-b border-border last:border-b-0"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
        {section.isDraft && (
          <Badge variant="secondary" className="text-xs shrink-0">Rascunho</Badge>
        )}
      </div>

      {section.description && (
        <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
      )}

      {/* Vídeo embutido na seção — decisão do usuário: leitura contínua
          mistura texto e vídeo, sem separar por tipo de conteúdo. */}
      {section.videoId ? (
        <div className="mb-5 rounded-xl overflow-hidden">
          <StudyVideoPlayer videoId={section.videoId} />
        </div>
      ) : section.embedUrl ? (
        <div className="mb-5 w-full aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={section.embedUrl}
            title={section.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {section.contentText && (
        <div
          className="rich-text manual-content"
          data-section-content={section.id}
          dangerouslySetInnerHTML={{ __html: section.contentText }}
        />
      )}

      {section.photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {section.photos.map((photo) => (
            <figure key={photo.id} className="rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || section.title} className="w-full object-cover" />
              {photo.caption && (
                <figcaption className="text-xs text-muted-foreground px-3 py-2">{photo.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {section.attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {section.attachments.map((att) => (
            <a
              key={att.id}
              href={att.url}
              download={att.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <span className="text-sm font-medium text-foreground flex-1 truncate">{att.name}</span>
            </a>
          ))}
        </div>
      )}

      {section.sheetUrl && (
        <div className="mt-4">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
            <Table2 className="w-4 h-4 text-green-600" />
            Planilha
          </h3>
          <div className="rounded-xl overflow-hidden border border-border w-full" style={{ height: 420 }}>
            <iframe src={section.sheetUrl} title={`Planilha — ${section.title}`} className="w-full h-full" />
          </div>
        </div>
      )}

      {section.task && (
        <div className="mt-5">
          <LessonTaskForm
            task={section.task}
            lessonId={section.id}
            initialResponse={section.myTaskResponse}
            isAdminPreview={isAdmin}
            taskStartDate={section.taskStartDate}
            taskEndDate={section.taskEndDate}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          size="sm"
          variant={isCompleted ? 'default' : 'outline'}
          onClick={handleToggle}
          disabled={isPending}
          className="gap-2"
        >
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          {isCompleted ? 'Concluída' : 'Marcar como concluída'}
        </Button>

        {/* Comentários montados sob demanda: com muitas seções numa página só,
            N instâncias de editor/estado ao mesmo tempo é peso morto que
            ninguém pediu — os comentários em si já vêm no payload (leve),
            só o componente é que espera o clique. */}
        <button
          type="button"
          onClick={() => setCommentsOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Comentários {section.comments.length > 0 && `(${section.comments.length})`}
        </button>
      </div>

      {commentsOpen && (
        <div className={cn('mt-4 pt-4 border-t border-border')}>
          <LessonComments
            lessonId={section.id}
            comments={section.comments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            canModerate={canModerate}
          />
        </div>
      )}
    </section>
  )
}
