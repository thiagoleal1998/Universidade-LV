import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LessonEditor } from '@/components/admin/lesson-editor'
import { TaskResponsesPanel } from '@/components/admin/task-responses-panel'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lesson, LessonPhoto, LessonAttachment } from '@/lib/supabase/types'
import type { LessonTask } from '@/app/actions/lesson-tasks'

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: lessonData },
    { data: photosData },
    { data: attachmentsData },
    { data: taskRaw },
  ] = await Promise.all([
    supabase.from('lessons').select('*').eq('id', id).single(),
    supabase.from('lesson_photos').select('*').eq('lesson_id', id).order('order_index'),
    supabase.from('lesson_attachments').select('*').eq('lesson_id', id).order('order_index'),
    supabase
      .from('lesson_tasks')
      .select('id, title, description, questions:lesson_task_questions(id, type, question, options, correct_options, correct_answer, required, order_index, points), response_count:lesson_task_responses(count)')
      .eq('lesson_id', id)
      .maybeSingle(),
  ])

  const lesson = lessonData as Lesson | null
  const photos = (photosData as LessonPhoto[] | null) ?? []
  const attachments = (attachmentsData as LessonAttachment[] | null) ?? []

  if (!lesson) notFound()

  const photoUrls = photos.map((p) => ({
    ...p,
    url: supabase.storage.from('lesson-photos').getPublicUrl(p.storage_path).data.publicUrl,
  }))

  const attachmentUrls = attachments.map((a) => ({
    ...a,
    url: supabase.storage.from('lesson-attachments').getPublicUrl(a.storage_path).data.publicUrl,
  }))

  const task = taskRaw
    ? {
        ...taskRaw,
        questions: (taskRaw.questions ?? []).map((q: any) => ({ ...q, options: q.options ?? [], correct_options: q.correct_options ?? [], points: q.points ?? 1, correct_answer: q.correct_answer ?? null })),
        response_count: (taskRaw as any).response_count?.[0]?.count ?? 0,
      } as LessonTask
    : null

  // Respostas dos membros para correção
  let responses: any[] = []
  if (task) {
    const { data: responsesRaw } = await adminClient
      .from('lesson_task_responses')
      .select('id, user_id, submitted_at, grade, feedback, graded_at, answers:lesson_task_answers(question_id, text_answer, option_indices, grade)')
      .eq('task_id', task.id)
      .order('submitted_at', { ascending: false })

    if (responsesRaw?.length) {
      const userIds = [...new Set(responsesRaw.map((r: any) => r.user_id))]
      const { data: profilesData } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      const profileMap = new Map((profilesData ?? []).map((p: any) => [p.id, p.full_name]))
      responses = responsesRaw.map((r: any) => ({
        ...r,
        member_name: profileMap.get(r.user_id) ?? 'Membro',
      }))
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/admin/modulos/${lesson.module_id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Editar Aula</h2>
          <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
            {lesson.is_published ? 'Publicada' : 'Rascunho'}
          </Badge>
        </div>
        <LessonEditor lesson={lesson} photos={photoUrls} attachments={attachmentUrls} task={task} />
      </div>

      {task && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Respostas ({responses.length})
            </h3>
          </div>
          <TaskResponsesPanel
            responses={responses}
            questions={task.questions}
            lessonId={id}
          />
        </div>
      )}
    </div>
  )
}
