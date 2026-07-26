import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CursosPageTabs } from '@/components/members/cursos-page-tabs'
import type { CourseCard } from '@/components/members/course-grid'
import type { InstructorEntry } from '@/components/members/instructors-grid'
import type { Module, Course } from '@/lib/supabase/types'
export const metadata = { title: 'Meus Cursos' }

type LessonSummary = { id: string; is_published: boolean }
type ModuleWithLessons = Module & { lessons: LessonSummary[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }

type InstructorCourseRow = {
  id: string
  name: string
  instructor_name: string | null
  instructor_role: string | null
  instructor_photo_url: string | null
  instructor_profile_id: string | null
}

// Agrega o instrutor de cada curso publicado numa lista única de pessoas
// (não é escopado à matrícula do membro — a ideia é servir de diretório
// de todo mundo que já dá aula na plataforma). Cursos com o mesmo perfil
// vinculado viram uma entrada só, com a lista de cursos que a pessoa dá;
// cursos com instrutor só em texto livre (sem perfil) são agrupados pelo
// nome digitado, já que não há como saber se são a mesma pessoa de outra forma.
function buildInstructors(
  courses: InstructorCourseRow[],
  profilesById: Map<string, { full_name: string; job_title: string | null; avatar_url: string | null; bio: string }>
): InstructorEntry[] {
  const map = new Map<string, InstructorEntry>()
  for (const c of courses) {
    const linked = c.instructor_profile_id ? profilesById.get(c.instructor_profile_id) : null
    const name = linked?.full_name || c.instructor_name
    if (!name) continue
    const key = c.instructor_profile_id || `name:${name}`
    const role = linked?.job_title || c.instructor_role
    const photo = linked?.avatar_url || c.instructor_photo_url
    const bio = linked?.bio || ''

    const existing = map.get(key)
    if (existing) {
      existing.courses.push({ id: c.id, name: c.name })
      if (!existing.role && role) existing.role = role
      if (!existing.photo && photo) existing.photo = photo
      if (!existing.bio && bio) existing.bio = bio
    } else {
      map.set(key, { key, name, role, photo, bio, courses: [{ id: c.id, name: c.name }] })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export default async function CursosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profileData?.role === 'admin'

  let accessibleCourseIds: string[] = []
  if (!isAdmin) {
    const { data: accessData } = await supabase
      .from('member_courses')
      .select('course_id')
      .eq('member_id', user!.id)
    accessibleCourseIds = (accessData ?? []).map((a) => a.course_id)
  }

  let coursesQuery = supabase
    .from('courses')
    .select('*, modules(id, title, order_index, lessons(id, is_published))')
    .eq('is_published', true)
    .order('order_index')
    .order('order_index', { referencedTable: 'modules' })

  if (!isAdmin && accessibleCourseIds.length > 0) {
    coursesQuery = coursesQuery.in('id', accessibleCourseIds)
  }

  const { data: coursesData } = isAdmin || accessibleCourseIds.length > 0
    ? await coursesQuery
    : { data: [] }

  const { data: progressData } = await supabase
    .from('member_progress')
    .select('lesson_id')
    .eq('user_id', user!.id)

  const courses = (coursesData ?? []) as CourseWithModules[]
  const completedIds = (progressData ?? []).map((p) => p.lesson_id)

  // Instrutores ULV: diretório de TODOS os cursos publicados da plataforma,
  // não escopado à matrícula do membro (é uma vitrine de quem dá aula, não
  // "meus professores").
  const adminClient = createAdminClient()
  const { data: allCoursesData } = await adminClient
    .from('courses')
    .select('id, name, instructor_name, instructor_role, instructor_photo_url, instructor_profile_id')
    .eq('is_published', true)

  const instructorProfileIds = [...new Set(
    (allCoursesData ?? []).map((c) => c.instructor_profile_id).filter((id): id is string => !!id)
  )]
  const { data: instructorProfilesData } = instructorProfileIds.length > 0
    ? await adminClient.from('profiles').select('id, full_name, job_title, avatar_url, bio').in('id', instructorProfileIds)
    : { data: [] }
  const profilesById = new Map((instructorProfilesData ?? []).map((p) => [p.id, p]))
  const instructors = buildInstructors((allCoursesData ?? []) as InstructorCourseRow[], profilesById)

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Cursos</h1>

      <CursosPageTabs
        courses={courses as CourseCard[]}
        completedIds={completedIds}
        instructors={instructors}
      />
    </div>
  )
}
