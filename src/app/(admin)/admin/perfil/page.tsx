import { createClient } from '@/lib/supabase/server'
import { ProfileTabs } from '@/components/members/profile-tabs'

export default async function AdminPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accessData } = await supabase
    .from('member_courses')
    .select('course_id')
    .eq('member_id', user!.id)

  const courseIds = (accessData ?? []).map((a) => a.course_id)

  const [
    { data: profileData },
    { data: coursesData },
    { data: progressData },
    { data: certsData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, created_at, company, job_title, linkedin_url')
      .eq('id', user!.id)
      .single(),

    courseIds.length > 0
      ? supabase
          .from('courses')
          .select('id, name, modules(id, title, is_published, order_index, lessons(id, is_published))')
          .in('id', courseIds)
          .eq('is_published', true)
          .order('order_index')
      : Promise.resolve({ data: [] }),

    supabase
      .from('member_progress')
      .select('lesson_id')
      .eq('user_id', user!.id),

    supabase
      .from('certificates')
      .select('id, module_id, status, issued_at, modules(title)')
      .eq('user_id', user!.id),
  ])

  const profile = profileData as { full_name: string; avatar_url: string; created_at: string; company: string; job_title: string; linkedin_url: string } | null
  const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id))

  type CourseRow = {
    id: string
    name: string
    modules: {
      id: string
      title: string
      is_published: boolean
      order_index: number
      lessons: { id: string; is_published: boolean }[]
    }[]
  }

  const courses = (coursesData ?? []) as CourseRow[]

  const courseProgress = courses.map((c) => {
    const mods = (c.modules ?? [])
      .filter((m) => m.is_published)
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => {
        const published = m.lessons.filter((l) => l.is_published)
        const done = published.filter((l) => completedSet.has(l.id)).length
        return { id: m.id, title: m.title, total: published.length, done }
      })
    const total = mods.reduce((s, m) => s + m.total, 0)
    const done = mods.reduce((s, m) => s + m.done, 0)
    return { id: c.id, name: c.name, total, done, modules: mods }
  })

  type CertRow = {
    id: string
    module_id: string
    status: string
    issued_at: string
    modules: { title: string } | null
  }
  const certs = (certsData ?? []) as unknown as CertRow[]
  const certModuleIds = new Set(certs.map((c) => c.module_id))

  const pendingModules = courseProgress.flatMap((c) =>
    c.modules
      .filter((m) => m.total > 0 && m.done === m.total && !certModuleIds.has(m.id))
      .map((m) => ({ ...m, courseName: c.name }))
  )

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <ProfileTabs
        userId={user!.id}
        fullName={profile?.full_name ?? ''}
        email={user?.email ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
        company={profile?.company ?? ''}
        jobTitle={profile?.job_title ?? ''}
        linkedinUrl={profile?.linkedin_url ?? ''}
        memberSince={profile?.created_at ?? ''}
        courseProgress={courseProgress}
        certificates={certs.map((c) => ({
          id: c.id,
          moduleId: c.module_id,
          moduleTitle: (c.modules as { title: string } | null)?.title ?? '',
          status: c.status as 'internal' | 'approved',
          issuedAt: c.issued_at,
        }))}
        pendingModules={pendingModules}
      />
    </div>
  )
}
