'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toggleLessonComplete } from '@/app/actions/progress'
import { StudyVideoPlayer } from '@/components/members/study-video-player'
import { StudyCurriculum, type CurriculumModule } from '@/components/members/study-curriculum'
import { StudyNotes } from '@/components/members/study-notes'
import { LessonComments } from '@/components/members/lesson-comments'
import { LessonTaskForm } from '@/components/members/lesson-task-form'
import { ThemeToggle } from '@/components/theme-toggle'
import type { LessonTask, TaskResponse } from '@/app/actions/lesson-tasks'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle,
  PanelRight, PanelRightClose, GraduationCap, X, Table2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function getSheetEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsMatch) {
    const id = gsMatch[1]
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `?gid=${gidMatch[1]}` : ''
    return `https://docs.google.com/spreadsheets/d/${id}/htmlview${gid}`
  }
  if (url.includes('sharepoint.com') || url.includes('office.com') || url.includes('onedrive.live.com')) {
    return url.includes('action=embedview') ? url : `${url}&action=embedview`
  }
  return null
}

type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  profiles: { full_name: string } | null
}

type Photo = { id: string; url: string; caption: string }
type Attachment = { id: string; name: string; url: string; size_bytes: number; mime_type: string }

type Props = {
  lessonId: string
  lessonTitle: string
  lessonDescription: string | null
  contentText: string | null
  embedUrl: string | null
  videoId: string | null
  photos: Photo[]
  attachments: Attachment[]
  isCompleted: boolean
  isAdmin: boolean
  isDraft: boolean
  note: string
  courseId: string
  courseName: string
  logoUrl: string
  siteName: string
  curriculum: CurriculumModule[]
  prevLessonId: string | null
  nextLessonId: string | null
  nextLessonTitle: string | null
  comments: Comment[]
  currentUserId: string
  totalDone: number
  totalLessons: number
  task?: LessonTask | null
  myTaskResponse?: TaskResponse | null
  sheetUrl?: string | null
  taskStartDate?: string | null
  taskEndDate?: string | null
}

type Tab = 'sobre' | 'comentarios' | 'anotacoes'

export function StudyInterface({
  lessonId,
  lessonTitle,
  lessonDescription,
  contentText,
  embedUrl,
  videoId,
  photos,
  attachments,
  isCompleted: initialCompleted,
  isAdmin,
  isDraft,
  note,
  courseId,
  courseName,
  logoUrl,
  siteName,
  curriculum,
  prevLessonId,
  nextLessonId,
  nextLessonTitle,
  comments,
  currentUserId,
  totalDone,
  totalLessons,
  task = null,
  myTaskResponse = null,
  sheetUrl = null,
  taskStartDate = null,
  taskEndDate = null,
}: Props) {
  const router = useRouter()
  const [completed, setCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('sobre')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNextBanner, setShowNextBanner] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0

  useEffect(() => {
    setCompleted(initialCompleted)
    setShowNextBanner(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [lessonId, initialCompleted])

  function startCountdown() {
    if (!nextLessonId) return
    setCountdown(5)
    setShowNextBanner(true)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          router.push(`/dashboard/aulas/${nextLessonId}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function dismissBanner() {
    setShowNextBanner(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  function handleToggle() {
    startTransition(async () => {
      const next = !completed
      const result = await toggleLessonComplete(lessonId, next)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setCompleted(next)
        if (next) {
          toast.success('Aula concluída!')
          if (nextLessonId) startCountdown()
        } else {
          toast.success('Marcação removida.')
        }
      }
    })
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dashboard/cursos/${courseId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Cursos</span>
          </Link>

          <div className="hidden sm:block w-px h-4 bg-border" />

          {logoUrl ? (
            <Image src={logoUrl} alt={siteName} width={20} height={20} className="object-contain shrink-0" />
          ) : (
            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
          )}

          <span className="text-sm font-medium text-foreground truncate hidden md:block">{courseName}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{totalDone}/{totalLessons}</span>
          </div>

          {isDraft && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Rascunho</Badge>
          )}

          <ThemeToggle className="w-8 h-8" />

          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarOpen ? 'Fechar currículo' : 'Abrir currículo'}
          >
            {sidebarOpen
              ? <PanelRightClose className="w-4 h-4" />
              : <PanelRight className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Video */}
          {videoId ? (
            <StudyVideoPlayer videoId={videoId} />
          ) : embedUrl ? (
            <div className="w-full aspect-video bg-black">
              <iframe
                src={embedUrl}
                title={lessonTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {/* Tabs */}
          <div className="border-b border-border px-6 flex gap-1 shrink-0">
            {([
              { id: 'sobre',       label: 'Sobre' },
              { id: 'comentarios', label: 'Comentários' },
              { id: 'anotacoes',   label: 'Anotações' },
            ] as { id: Tab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {tab === 'sobre' && (
              <>
                <div>
                  <h1 className="text-xl font-bold text-green-600">{lessonTitle}</h1>
                  {lessonDescription && (
                    <p className="text-muted-foreground mt-1 text-sm">{lessonDescription}</p>
                  )}
                </div>

                {contentText && (
                  <div
                    className="rich-text"
                    dangerouslySetInnerHTML={{ __html: contentText }}
                  />
                )}

                {photos.length > 0 && (
                  <div>
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

                {attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Materiais de Apoio</h3>
                    <div className="space-y-2">
                      {attachments.map((att) => (
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
                  </div>
                )}

                {sheetUrl && getSheetEmbedUrl(sheetUrl) && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-green-600" />
                      Planilha
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-border w-full" style={{ height: 420 }}>
                      <iframe
                        src={getSheetEmbedUrl(sheetUrl)!}
                        title="Planilha da aula"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {task && (
                  <LessonTaskForm
                    task={task}
                    lessonId={lessonId}
                    initialResponse={myTaskResponse}
                    isAdminPreview={isAdmin}
                    taskStartDate={taskStartDate}
                    taskEndDate={taskEndDate}
                  />
                )}
              </>
            )}

            {tab === 'comentarios' && (
              <LessonComments
                lessonId={lessonId}
                comments={comments}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            )}

            {tab === 'anotacoes' && (
              <StudyNotes lessonId={lessonId} initialContent={note} />
            )}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4 shrink-0">
            {prevLessonId ? (
              <Link
                href={`/dashboard/aulas/${prevLessonId}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </Link>
            ) : <div />}

            <Button
              variant={completed ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggle}
              disabled={isPending}
              className="gap-2"
            >
              {completed
                ? <><CheckCircle2 className="w-4 h-4" /> Concluída</>
                : <><Circle className="w-4 h-4" /> Marcar como concluída</>}
            </Button>

            {nextLessonId ? (
              <Link
                href={`/dashboard/aulas/${nextLessonId}`}
                className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}
              >
                Próxima
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* Curriculum sidebar */}
        <StudyCurriculum
          modules={curriculum}
          currentLessonId={lessonId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Next lesson banner ── */}
      {showNextBanner && nextLessonId && nextLessonTitle && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-xl px-5 py-3 flex items-center gap-4 max-w-md w-full">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Aula concluída!</p>
            <p className="text-xs text-muted-foreground truncate">Próxima: {nextLessonTitle}</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (countdownRef.current) clearInterval(countdownRef.current)
              router.push(`/dashboard/aulas/${nextLessonId}`)
            }}
          >
            Ir agora ({countdown}s)
          </Button>
          <button
            onClick={dismissBanner}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
