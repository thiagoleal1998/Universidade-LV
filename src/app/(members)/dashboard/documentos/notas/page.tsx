import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ClipboardCheck, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function NotasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Busca respostas com nota
  const { data: responsesRaw } = await adminClient
    .from('lesson_task_responses')
    .select('id, task_id, submitted_at, grade, feedback, graded_at')
    .eq('user_id', user.id)
    .not('grade', 'is', null)
    .order('graded_at', { ascending: false })

  const responses = responsesRaw ?? []

  // Busca tarefas e aulas correspondentes
  let taskMap = new Map<string, { title: string; lesson_id: string; lesson_title: string }>()
  if (responses.length) {
    const taskIds = [...new Set(responses.map((r) => r.task_id))]
    const { data: tasks } = await adminClient
      .from('lesson_tasks')
      .select('id, title, lesson_id')
      .in('id', taskIds)

    if (tasks?.length) {
      const lessonIds = [...new Set(tasks.map((t) => t.lesson_id))]
      const { data: lessons } = await adminClient
        .from('lessons')
        .select('id, title')
        .in('id', lessonIds)
      const lessonTitleMap = new Map((lessons ?? []).map((l) => [l.id, l.title]))

      taskMap = new Map(
        tasks.map((t) => [t.id, {
          title: t.title,
          lesson_id: t.lesson_id,
          lesson_title: lessonTitleMap.get(t.lesson_id) ?? 'Aula',
        }])
      )
    }
  }

  function gradeColor(grade: number) {
    if (grade >= 7) return 'text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30'
    if (grade >= 5) return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
    return 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Minhas Notas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tarefas corrigidas e feedback do seu instrutor.
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Star className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhuma nota disponível ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Suas notas aparecerão aqui quando suas tarefas forem corrigidas.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((resp) => {
            const task = taskMap.get(resp.task_id)
            if (!task) return null
            const grade = resp.grade as number
            return (
              <div key={resp.id} className="border rounded-xl bg-card overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  {/* Grade badge */}
                  <div className={cn(
                    'flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border font-bold text-lg',
                    gradeColor(grade)
                  )}>
                    <span className="tabular-nums leading-none">{grade % 1 === 0 ? grade : grade.toFixed(1)}</span>
                    <span className="text-xs font-normal opacity-70 leading-none mt-0.5">/10</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ClipboardCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">{task.lesson_title}</p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/aulas/${task.lesson_id}?tab=tarefa`}
                        className="shrink-0 text-xs text-primary hover:underline"
                      >
                        Ver aula →
                      </Link>
                    </div>

                    {resp.feedback && (
                      <div className="mt-2.5 flex items-start gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{resp.feedback}</p>
                      </div>
                    )}

                    {resp.graded_at && (
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        Corrigido em {new Date(resp.graded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
