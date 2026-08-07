import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireModuleAccess } from '@/lib/authz'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CheckCircle2, ChevronRight, Eye, Lock, ArrowLeft } from 'lucide-react'
import { ModuleCompletionBanner } from '@/components/members/module-certificate'
import { ModuleManual } from '@/components/members/module-manual'
import type { ManualSectionData } from '@/components/members/manual-section'
import { stripHtmlToText } from '@/lib/manual'
import { cn } from '@/lib/utils'
import type { Module, Lesson, LessonPhoto, LessonAttachment } from '@/lib/supabase/types'
import type { LessonTask, TaskResponse } from '@/app/actions/lesson-tasks'

type LessonRow = Pick<Lesson, 'id' | 'title' | 'is_published' | 'order_index'>
type ModuleWithLessons = Module & { lessons: LessonRow[] }

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function getEmbedUrl(url: string): string | null {
  const ytId = extractYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`
  if (url.includes('google.com')) {
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/)
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/)
    if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`
  }
  return null
}

export default async function ModulePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aula?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'

  // Admin usa cliente sem RLS para ver rascunhos; membro usa cliente normal
  const client = isAdmin ? createAdminClient() : supabase

  const { data: mod } = await client
    .from('modules')
    .select('*, lessons(id, title, is_published, order_index)')
    .eq('id', id)
    .order('order_index', { referencedTable: 'lessons' })
    .single() as { data: ModuleWithLessons | null }

  if (!mod) notFound()

  // Membro não pode ver módulo despublicado
  if (!isAdmin && !mod.is_published) notFound()

  // Check prerequisite for members
  let prereqTitle: string | null = null
  if (!isAdmin && mod.prerequisite_module_id) {
    const { data: prereqMod } = await client
      .from('modules')
      .select('id, title, lessons(id, is_published)')
      .eq('id', mod.prerequisite_module_id)
      .eq('is_published', true)
      .single()

    if (prereqMod) {
      const { data: prereqProgress } = await supabase
        .from('member_progress')
        .select('lesson_id')
        .eq('user_id', user.id)

      const completedIds = new Set((prereqProgress ?? []).map((p) => p.lesson_id))
      const publishedLessons = (prereqMod.lessons as { id: string; is_published: boolean }[]).filter((l) => l.is_published)
      const allDone = publishedLessons.length > 0 && publishedLessons.every((l) => completedIds.has(l.id))

      if (!allDone) {
        prereqTitle = (prereqMod as { title: string }).title
      }
    }
  }

  const [{ data: progressData }, { data: certData }] = await Promise.all([
    supabase.from('member_progress').select('lesson_id, completed_at').eq('user_id', user.id),
    supabase.from('certificates').select('id').eq('user_id', user.id).eq('module_id', id).eq('status', 'approved').maybeSingle(),
  ])

  const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id))
  const visibleLessons = mod.lessons.filter((l) => isAdmin || l.is_published)
  const publishedLessons = mod.lessons.filter((l) => l.is_published)
  const completedCount = publishedLessons.filter((l) => completedSet.has(l.id)).length
  const lastCompleted = (progressData ?? [])
    .filter((p) => publishedLessons.find((l) => l.id === p.lesson_id))
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
  const progress = publishedLessons.length > 0
    ? Math.round((completedCount / publishedLessons.length) * 100)
    : 0

  const isDraft = !mod.is_published

  // Locked state for members who haven't completed the prerequisite
  if (prereqTitle) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Lock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{mod.title}</h2>
          <p className="text-muted-foreground mb-6">
            Este módulo está bloqueado. Conclua <strong>{prereqTitle}</strong> primeiro para ter acesso.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar para meus cursos
          </Link>
        </div>
      </div>
    )
  }

  // Formato "Manual interativo": buscamos courses.layout com um client de
  // service role NOVO (não o `client` de cima, que é RLS de sessão quando
  // não-admin) — evita que a checagem de layout seja bloqueada num cenário
  // de prévia de curso não publicado.
  const courseIdForLayout = mod.course_id
  let courseLayout: 'padrao' | 'manual' = 'padrao'
  if (courseIdForLayout) {
    const adminForLayout = createAdminClient()
    const { data: courseRow } = await adminForLayout
      .from('courses')
      .select('layout')
      .eq('id', courseIdForLayout)
      .single()
    if (courseRow?.layout === 'manual') courseLayout = 'manual'
  }

  if (courseLayout === 'manual') {
    const adminClient = createAdminClient()
    const lessonIds = visibleLessons.map((l) => l.id)

    // Moderar comentários no manual: mesmo guard usado na aula clássica
    // (admin, ou colaborador dono do curso desta aula/módulo).
    const canModerate = !('error' in (await requireModuleAccess(mod.id)))

    const [
      { data: fullLessons },
      { data: photosData },
      { data: attachmentsData },
      { data: commentsData },
      { data: tasksRaw },
    ] = lessonIds.length > 0
      ? await Promise.all([
          adminClient.from('lessons').select('*').in('id', lessonIds),
          adminClient.from('lesson_photos').select('*').in('lesson_id', lessonIds).order('order_index'),
          adminClient.from('lesson_attachments').select('*').in('lesson_id', lessonIds).order('order_index'),
          supabase.from('lesson_comments').select('id, body, created_at, user_id, parent_id, is_pinned, is_hidden, lesson_id').in('lesson_id', lessonIds).order('created_at'),
          adminClient
            .from('lesson_tasks')
            .select('id, lesson_id, title, description, questions:lesson_task_questions(id, type, question, options, correct_options, required, order_index)')
            .in('lesson_id', lessonIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }] as const

    const lessonsById = new Map((fullLessons ?? []).map((l) => [l.id, l as Lesson]))

    const photosByLesson = new Map<string, LessonPhoto[]>()
    for (const p of (photosData as LessonPhoto[] | null) ?? []) {
      const arr = photosByLesson.get(p.lesson_id) ?? []
      arr.push(p)
      photosByLesson.set(p.lesson_id, arr)
    }

    const attachmentsByLesson = new Map<string, LessonAttachment[]>()
    for (const a of (attachmentsData as LessonAttachment[] | null) ?? []) {
      const arr = attachmentsByLesson.get(a.lesson_id) ?? []
      arr.push(a)
      attachmentsByLesson.set(a.lesson_id, arr)
    }

    type CommentRow = { id: string; body: string; created_at: string; user_id: string; parent_id: string | null; is_pinned: boolean; is_hidden: boolean; lesson_id: string }
    const rawComments = (commentsData as CommentRow[] | null) ?? []
    const commentUserIds = [...new Set(rawComments.map((c) => c.user_id))]
    const { data: commentProfiles } = commentUserIds.length > 0
      ? await adminClient.from('profiles').select('id, full_name').in('id', commentUserIds)
      : { data: [] }
    const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p.full_name]))
    const commentsByLesson = new Map<string, ManualSectionData['comments']>()
    for (const c of rawComments) {
      const arr = commentsByLesson.get(c.lesson_id) ?? []
      arr.push({ ...c, profiles: { full_name: profileMap.get(c.user_id) ?? 'Membro' } })
      commentsByLesson.set(c.lesson_id, arr)
    }

    type TaskRow = { id: string; lesson_id: string; title: string; description: string | null; questions: LessonTask['questions'] }
    const tasksByLesson = new Map<string, LessonTask>()
    for (const t of (tasksRaw as TaskRow[] | null) ?? []) {
      tasksByLesson.set(t.lesson_id, {
        id: t.id,
        lesson_id: t.lesson_id,
        title: t.title,
        description: t.description ?? '',
        questions: (t.questions ?? []).map((q) => ({ ...q, options: q.options ?? [] })),
        response_count: 0,
      })
    }

    let myResponsesByTask = new Map<string, TaskResponse>()
    if (!isAdmin && tasksByLesson.size > 0) {
      const taskIds = [...tasksByLesson.values()].map((t) => t.id)
      const { data: responsesData } = await supabase
        .from('lesson_task_responses')
        .select('id, task_id, submitted_at, attempt_number, answers:lesson_task_answers(question_id, text_answer, option_indices)')
        .eq('user_id', user.id)
        .in('task_id', taskIds)
      myResponsesByTask = new Map(((responsesData ?? []) as (TaskResponse & { task_id: string })[]).map((r) => [r.task_id, r]))
    }

    const sections: ManualSectionData[] = visibleLessons.map((l) => {
      const full = lessonsById.get(l.id)
      const videoId = full?.youtube_url ? extractYouTubeId(full.youtube_url) : null
      const embedUrl = full?.youtube_url ? getEmbedUrl(full.youtube_url) : null
      const photos = (photosByLesson.get(l.id) ?? []).map((p) => ({
        id: p.id,
        url: adminClient.storage.from('lesson-photos').getPublicUrl(p.storage_path).data.publicUrl,
        caption: p.caption,
      }))
      const attachments = (attachmentsByLesson.get(l.id) ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        url: adminClient.storage.from('lesson-attachments').getPublicUrl(a.storage_path).data.publicUrl,
        size_bytes: a.size_bytes,
        mime_type: a.mime_type,
      }))
      const task = tasksByLesson.get(l.id) ?? null

      return {
        id: l.id,
        title: l.title,
        description: full?.description ?? null,
        contentText: full?.content_text ?? null,
        searchText: stripHtmlToText(full?.content_text ?? ''),
        embedUrl,
        videoId,
        photos,
        attachments,
        sheetUrl: full?.sheet_url ?? null,
        task: task ?? null,
        myTaskResponse: task ? myResponsesByTask.get(task.id) ?? null : null,
        taskStartDate: full?.task_start_date ?? null,
        taskEndDate: full?.task_end_date ?? null,
        comments: commentsByLesson.get(l.id) ?? [],
        isDraft: !l.is_published,
      }
    })

    return (
      <ModuleManual
        moduleId={mod.id}
        moduleTitle={mod.title}
        moduleDescription={mod.description ?? ''}
        isAdmin={isAdmin}
        canModerate={canModerate}
        currentUserId={user.id}
        hasCertificate={!!certData}
        sections={sections}
        initialCompletedIds={[...completedSet]}
        initialSectionId={sp.aula ?? null}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Banner de prévia */}
      {isAdmin && isDraft && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl px-4 py-3 text-sm font-medium">
          <Eye className="w-4 h-4 shrink-0" />
          Modo prévia — este módulo ainda não foi publicado e não está visível para os membros.
        </div>
      )}

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
          {isAdmin && (
            <Badge variant={isDraft ? 'secondary' : 'default'} className="text-xs">
              {isDraft ? 'Rascunho' : 'Publicado'}
            </Badge>
          )}
        </div>
        {mod.description && (
          <p className="text-muted-foreground text-sm mt-1">{mod.description}</p>
        )}

        {/* Progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} de {publishedLessons.length} aulas concluídas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de aulas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {visibleLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma aula disponível neste módulo.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {visibleLessons.map((lesson) => {
              const done = completedSet.has(lesson.id)
              const isLessonDraft = !lesson.is_published
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/aulas/${lesson.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                    )}
                    <span className={`text-sm ${isLessonDraft ? 'text-muted-foreground' : 'text-green-600'}`}>
                      {lesson.title}
                    </span>
                    {isAdmin && isLessonDraft && (
                      <Badge variant="secondary" className="text-[10px] py-0">rascunho</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Banner de conclusão */}
      {!isAdmin && progress === 100 && publishedLessons.length > 0 && (
        <ModuleCompletionBanner hasCertificate={!!certData} />
      )}

      {isAdmin && (
        <div className="text-center">
          <Link
            href={`/admin/modulos/${mod.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para edição
          </Link>
        </div>
      )}
    </div>
  )
}
