import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreateMemberDialog } from '@/components/admin/create-member-dialog'
import { MembrosTabs } from '@/components/admin/membros-tabs'
import { getCollaboratorAreas } from '@/app/actions/collaborator-areas'
import { requireAdminPage } from '@/lib/authz'
import { presenceSinceIso } from '@/lib/presence'
import { DashboardAutoRefresh } from '@/components/admin/dashboard-auto-refresh'

export default async function MembrosPage() {
  await requireAdminPage()

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profiles },
    { data: usersData },
    { data: tags },
    { data: profileTags },
    { data: coursesData },
    { data: memberCoursesData },
    areas,
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    adminClient.auth.admin.listUsers(),
    supabase.from('tags').select('*').order('name'),
    supabase.from('profile_tags').select('profile_id, tag_id'),
    supabase.from('courses').select('id, name').order('order_index'),
    supabase.from('member_courses').select('member_id, course_id'),
    getCollaboratorAreas(),
  ])

  const emailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )

  const profileTagMap = new Map<string, string[]>()
  for (const pt of profileTags ?? []) {
    const existing = profileTagMap.get(pt.profile_id) ?? []
    existing.push(pt.tag_id)
    profileTagMap.set(pt.profile_id, existing)
  }

  const memberCourseMap = new Map<string, string[]>()
  for (const mc of memberCoursesData ?? []) {
    const existing = memberCourseMap.get(mc.member_id) ?? []
    existing.push(mc.course_id)
    memberCourseMap.set(mc.member_id, existing)
  }

  const onlineSince = presenceSinceIso()
  const members = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
    tagIds: profileTagMap.get(p.id) ?? [],
    courseIds: memberCourseMap.get(p.id) ?? [],
    isOnline: !!p.last_seen_at && p.last_seen_at > onlineSince,
  }))

  const pending = members.filter((m) => !m.active && !m.rejected_at && m.role !== 'admin')
  const rejected = members.filter((m) => !!m.rejected_at)
  const active = members.filter((m) => m.active || m.role === 'admin')
  const allTags = tags ?? []
  const allCourses = coursesData ?? []

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Membros</h2>
          <p className="text-sm text-muted-foreground mt-1">{active.length} ativos · {pending.length} pendentes</p>
        </div>
        <CreateMemberDialog />
      </div>

      <MembrosTabs pending={pending} rejected={rejected} active={active} allTags={allTags} allCourses={allCourses} areas={areas} />
      <DashboardAutoRefresh />
    </div>
  )
}
