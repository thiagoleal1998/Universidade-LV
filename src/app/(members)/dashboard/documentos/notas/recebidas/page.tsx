import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import { NotaCard } from '@/components/members/nota-card'
import type { NotaData } from '@/components/members/nota-card'

export default async function NotasRecebidasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Respostas corrigidas com respostas por questão
  const { data: responsesRaw } = await adminClient
    .from('lesson_task_responses')
    .select('id, task_id, submitted_at, grade, feedback, graded_at, answers:lesson_task_answers(question_id, text_answer, option_indices, grade)')
    .eq('user_id', user.id)
    .not('grade', 'is', null)
    .order('graded_at', { ascending: false })

  const responses = responsesRaw ?? []

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Star className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Nenhuma nota recebida ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Suas notas aparecerão aqui quando suas tarefas forem corrigidas.
          </p>
        </div>
      </div>
    )
  }

  // Tarefas e aulas
  const taskIds = [...new Set(responses.map((r) => r.task_id))]
  const { data: tasks } = await adminClient
    .from('lesson_tasks')
    .select('id, title, lesson_id')
    .in('id', taskIds)

  const lessonIds = [...new Set((tasks ?? []).map((t) => t.lesson_id))]
  const [{ data: lessons }, { data: questionsRaw }] = await Promise.all([
    adminClient.from('lessons').select('id, title').in('id', lessonIds),
    adminClient
      .from('lesson_task_questions')
      .select('id, task_id, question, type, options, correct_options, correct_answer, points, order_index')
      .in('task_id', taskIds)
      .order('order_index'),
  ])

  const lessonTitleMap = new Map((lessons ?? []).map((l) => [l.id, l.title]))
  const taskMap = new Map((tasks ?? []).map((t) => [t.id, {
    title: t.title,
    lesson_id: t.lesson_id,
    lesson_title: lessonTitleMap.get(t.lesson_id) ?? 'Aula',
  }]))
  const questionsByTask = new Map<string, typeof questionsRaw>()
  for (const q of (questionsRaw ?? [])) {
    const list = questionsByTask.get(q.task_id) ?? []
    list.push(q)
    questionsByTask.set(q.task_id, list)
  }

  const notas: NotaData[] = responses.flatMap((resp) => {
    const task = taskMap.get(resp.task_id)
    if (!task) return []
    return [{
      id: resp.id,
      grade: resp.grade as number,
      feedback: resp.feedback ?? null,
      graded_at: resp.graded_at ?? null,
      submitted_at: resp.submitted_at,
      taskTitle: task.title,
      lessonTitle: task.lesson_title,
      lessonId: task.lesson_id,
      answers: (resp.answers ?? []) as NotaData['answers'],
      questions: ((questionsByTask.get(resp.task_id) ?? []) as NotaData['questions']),
    }]
  })

  return (
    <div className="space-y-3">
      {notas.map((nota) => (
        <NotaCard key={nota.id} nota={nota} />
      ))}
    </div>
  )
}
