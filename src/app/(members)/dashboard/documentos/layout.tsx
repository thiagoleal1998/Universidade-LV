import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { SubNav } from '@/components/members/sub-nav'

export default async function DocumentosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // Notificações de nota não lidas → badge no item "Notas"
  const { count: newGradesCount } = await adminClient
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'task_graded')
    .is('read_at', null)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Documentos</h1>
          <p className="text-sm text-muted-foreground">Certificados e anotações das suas aulas.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        <SubNav badges={{ '/dashboard/documentos/notas': newGradesCount ?? 0 }} />
      </div>

      {children}
    </div>
  )
}
