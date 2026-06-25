import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, ClipboardCheck } from 'lucide-react'

export default async function NotasPendentesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  const { data: responsesRaw } = await adminClient
    .from('lesson_task_responses')
    .select('id, task_id, submitted_at')
    .eq('user_id', user.id)
    .is('grade', null)
    .order('submitted_at', { ascending: false })

  const responses = responsesRaw ?? []

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

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Nenhuma tarefa pendente</p>
          <p className="text-xs text-muted-foreground mt-1">
            Quando você enviar uma tarefa, ela aparecerá aqui até ser corrigida.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {responses.map((resp) => {
        const task = taskMap.get(resp.task_id)
        if (!task) return null
        const diasAguardando = Math.floor(
          (Date.now() - new Date(resp.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        return (
          <div key={resp.id} className="border rounded-xl bg-card overflow-hidden">
            <div className="p-4 flex items-start gap-4">
              {/* Ícone de espera */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                <Clock className="w-6 h-6 text-amber-500" />
                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-1 leading-tight text-center">
                  {diasAguardando === 0 ? 'hoje' : `${diasAguardando}d`}
                </span>
              </div>

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

                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Aguardando correção</span>
                </div>

                <p className="text-xs text-muted-foreground/60 mt-1.5">
                  Enviado em {new Date(resp.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
