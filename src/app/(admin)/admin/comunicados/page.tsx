import { createAdminClient } from '@/lib/supabase/admin'
import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import { requireAdminPage } from '@/lib/authz'

export default async function ComunicadosPage() {
  // Admin-only (voltou a ser assim na v1.84.0) — comunicado vai pra TODOS os
  // membros, não faz sentido colaborador criar; quem precisa avisar algo do
  // próprio curso usa a Comunidade dele.
  await requireAdminPage()

  const adminClient = createAdminClient()

  const { data } = await adminClient
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Comunicados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Publique avisos e novidades para os membros.
        </p>
      </div>
      <AnnouncementsManager announcements={data ?? []} />
    </div>
  )
}
