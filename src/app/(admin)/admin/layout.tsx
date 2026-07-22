import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { getAdminContext } from '@/lib/authz'
import { PREVIEW_COOKIE } from '@/lib/preview'
import { getCollaboratorAreas } from '@/app/actions/collaborator-areas'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminNotificationSound } from '@/components/admin/admin-notification-sound'
import { PresenceHeartbeat } from '@/components/ui/presence-heartbeat'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getAdminContext()
  if (!ctx) redirect('/dashboard')

  const adminClient = createAdminClient()
  const [{ data: profileData }, settings, { count: unreadCount }, collaboratorAreas] = await Promise.all([
    adminClient.from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single(),
    getSettings(),
    adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
    getCollaboratorAreas(),
  ])

  const profile = profileData as { full_name: string; avatar_url: string; role: string } | null

  // Modo prévia: admin vê o próprio /admin simulando uma área de colaborador
  // específica (menu restrito + rótulo "Painel do Colaborador" + canEdit das
  // telas de conteúdo calculado como se fosse aquela área — via
  // getPreviewAreaContext() em cada página) — só navegação/visual, nenhum
  // guard de mutação lê esse cookie, ctx.role (real) continua admin em toda
  // action. Colaborador de verdade nunca tem o cookie considerado (checado
  // na action setCollaboratorPreview e aqui de novo, defensivamente).
  const jar = await cookies()
  const previewAreaId = ctx.role === 'admin' ? (jar.get(PREVIEW_COOKIE)?.value ?? null) : null
  const previewActive = !!previewAreaId
  const previewAreaName = collaboratorAreas.find((a) => a.id === previewAreaId)?.name ?? null
  const effectiveRole = previewActive ? 'collaborator' : ctx.role

  // Admin vê tudo (null = sem filtro). Colaborador (real ou em prévia) vê o
  // mesmo menu do admin, exceto Membros/SEO/FAQ (decisão do usuário) — cada
  // tela aberta tem sua própria regra de permissão (ver CLAUDE.md): Cursos/
  // Marketing = capacidade + posse por item; Comunicados = cria mas não
  // edita/exclui; Documentos = só certificados dos próprios cursos;
  // Comunidade = só visualiza; Relatórios = Atividades filtrada por posse.
  // Dashboard/Feedback/Configurações mostram versão de membro ou dados reais
  // sem restrição adicional.
  const allowedHrefs = effectiveRole === 'admin'
    ? null
    : [
        '/admin', '/admin/cursos', '/admin/comunicados', '/admin/documentos',
        '/admin/comunidade', '/admin/feedback', '/admin/marketing',
        '/admin/relatorios', '/admin/configuracoes',
      ]

  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebar
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        userName={profile?.full_name ?? ''}
        userEmail={user?.email ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
        navOrder={(() => { try { return JSON.parse(settings.nav_order) } catch { return [] } })()}
        unreadCount={unreadCount ?? 0}
        allowedHrefs={allowedHrefs}
        role={effectiveRole}
        previewActive={previewActive}
        previewAreaName={previewAreaName}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
      <AdminNotificationSound userId={user.id} />
      <PresenceHeartbeat />
    </div>
  )
}
