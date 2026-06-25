import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { NotasNav } from '@/components/members/notas-nav'

export default async function NotasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Tarefas enviadas sem correção ainda
  const { count: pendingCount } = await adminClient
    .from('lesson_task_responses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('grade', null)

  return (
    <div className="space-y-1">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Minhas Notas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe suas tarefas enviadas e notas recebidas.
        </p>
      </div>
      <NotasNav pendingCount={pendingCount ?? 0} />
      {children}
    </div>
  )
}
