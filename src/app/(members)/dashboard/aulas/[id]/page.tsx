import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { getNote } from '@/app/actions/notes'
import { StudyInterface } from '@/components/members/study-interface'
import type { Lesson, LessonPhoto, LessonAttachment } from '@/lib/supabase/types'
import type { LessonTask, TaskResponse } from '@/app/actions/lesson-tasks'

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

type ModuleRow = { id: string; title: string; order_index: number; course_id: string | null }
type LessonRow = { id: string; title: string; is_published: boolean; order_index: number; module_id: string }

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const initialTab = sp.tab === 'anotacoes' ? 'anotacoes' : sp.tab === 'comentarios' ? 'comentarios' : 'sobre'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profileData?.role === 'admin'
  const client = isAdmin ? await createAdminClient() : supabase

  // Fetch the lesson with module + course info
  const { data: lessonData } = await client
    .from('lessons')
    .select('*, modules(id, title, order_index, course_id, courses(id, name))')
    .eq('id', id)
    .single()

  const lesson = lessonData as (Lesson & {
    modules: (ModuleRow & { courses: { id: string; name: string } | null }) | null
  }) | null

  if (!lesson || (!isAdmin && !lesson.is_published)) notFound()

  const module = lesson.modules
  const course = module?.courses
  const courseId = course?.id ?? module?.course_id ?? ''
  const courseName = course?.name ?? module?.title ?? ''

  // Fetch curriculum: all modules + lessons for this course
  let curriculum: { id: string; title: string; order_index: number; lessons: LessonRow[] }[] = []

  if (courseId) {
    const { data: modulesData } = await client
      .from('modules')
      .select('id, title, order_index, lessons(id, title, is_published, order_index, module_id)')
      .eq('course_id', courseId)
      .order('order_index')

    if (modulesData) {
      curriculum = (modulesData as (ModuleRow & { lessons: LessonRow[] })[])
        .map((m) => ({
          ...m,
          lessons: (m.lessons ?? [])
            .filter((l) => isAdmin || l.is_published)
            .sort((a, b) => a.order_index - b.order_index),
        }))
        .filter((m) => m.lessons.length > 0)
    }
  }

  // All lessons in order (for prev/next navigation)
  const allLessons = curriculum.flatMap((m) => m.lessons)
  const currentIndex = allLessons.findIndex((l) => l.id === id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  // Progress
  const { data: progressData } = await supabase
    .from('member_progress')
    .select('lesson_id')
    .eq('user_id', user.id)

  const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id))

  // Build curriculum with completion status
  const curriculumWithStatus = curriculum.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      isCompleted: completedSet.has(l.id),
    })),
  }))

  const totalLessons = allLessons.length
  const totalDone = allLessons.filter((l) => completedSet.has(l.id)).length

  // Photos, attachments, comments, task
  const [
    { data: photosData },
    { data: attachmentsData },
    { data: commentsData },
    { data: taskRaw },
  ] = await Promise.all([
    client.from('lesson_photos').select('*').eq('lesson_id', id).order('order_index'),
    client.from('lesson_attachments').select('*').eq('lesson_id', id).order('order_index'),
    supabase.from('lesson_comments').select('id, body, created_at, user_id').eq('lesson_id', id).order('created_at'),
    supabase
      .from('lesson_tasks')
      .select('id, title, description, questions:lesson_task_questions(id, type, question, options, correct_options, required, order_index)')
      .eq('lesson_id', id)
      .maybeSingle(),
  ])

  const task: LessonTask | null = taskRaw
    ? {
        ...(taskRaw as any),
        questions: ((taskRaw as any).questions ?? []).map((q: any) => ({ ...q, options: q.options ?? [] })),
        response_count: 0,
      }
    : null

  let myResponse: TaskResponse | null = null
  if (task && !isAdmin) {
    const { data: resData } = await supabase
      .from('lesson_task_responses')
      .select('id, submitted_at, answers:lesson_task_answers(question_id, text_answer, option_indices)')
      .eq('task_id', task.id)
      .eq('user_id', user.id)
      .maybeSingle()
    myResponse = resData as TaskResponse | null
  }

  // Resolve nomes dos autores dos comentários via adminClient (bypassa RLS de profiles)
  const rawComments = (commentsData ?? []) as { id: string; body: string; created_at: string; user_id: string }[]
  const commentUserIds = [...new Set(rawComments.map((c) => c.user_id))]
  const adminForProfiles = createAdminClient()
  const { data: commentProfiles } = commentUserIds.length > 0
    ? await adminForProfiles.from('profiles').select('id, full_name').in('id', commentUserIds)
    : { data: [] }
  const profileMap = new Map((commentProfiles ?? []).map((p) => [p.id, p.full_name]))
  const comments = rawComments.map((c) => ({
    ...c,
    profiles: { full_name: profileMap.get(c.user_id) ?? 'Membro' },
  }))

  const rawPhotos = (photosData as LessonPhoto[] | null) ?? []
  const rawAttachments = (attachmentsData as LessonAttachment[] | null) ?? []

  const photos = rawPhotos.map((p) => ({
    id: p.id,
    url: client.storage.from('lesson-photos').getPublicUrl(p.storage_path).data.publicUrl,
    caption: p.caption,
  }))

  const attachments = rawAttachments.map((a) => ({
    id: a.id,
    name: a.name,
    url: client.storage.from('lesson-attachments').getPublicUrl(a.storage_path).data.publicUrl,
    size_bytes: a.size_bytes,
    mime_type: a.mime_type,
  }))

  const videoId = lesson.youtube_url ? extractYouTubeId(lesson.youtube_url) : null
  const embedUrl = lesson.youtube_url ? getEmbedUrl(lesson.youtube_url) : null

  const note = await getNote(id)
  const settings = await getSettings()

  return (
    <StudyInterface
      lessonId={id}
      lessonTitle={lesson.title}
      lessonDescription={lesson.description ?? null}
      contentText={lesson.content_text}
      embedUrl={embedUrl}
      videoId={videoId}
      photos={photos}
      attachments={attachments}
      isCompleted={completedSet.has(id)}
      isAdmin={isAdmin}
      isDraft={!lesson.is_published}
      note={note}
      courseId={courseId}
      courseName={courseName}
      logoUrl={settings.logo_url}
      siteName={settings.site_name}
      curriculum={curriculumWithStatus}
      prevLessonId={prevLesson?.id ?? null}
      nextLessonId={nextLesson?.id ?? null}
      nextLessonTitle={nextLesson?.title ?? null}
      comments={comments as Parameters<typeof StudyInterface>[0]['comments']}
      currentUserId={user.id}
      totalDone={totalDone}
      totalLessons={totalLessons}
      task={task}
      myTaskResponse={myResponse}
      sheetUrl={lesson.sheet_url ?? null}
      taskStartDate={lesson.task_start_date ?? null}
      taskEndDate={lesson.task_end_date ?? null}
      initialTab={initialTab}
    />
  )
}
