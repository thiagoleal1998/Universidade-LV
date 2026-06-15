'use server'

import { createClient } from '@/lib/supabase/server'

export type SearchResult = {
  type: 'curso' | 'aula'
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  const q = query?.trim() ?? ''
  if (q.length < 2) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profileData?.role === 'admin'

  let courseIds: string[] = []
  if (!isAdmin) {
    const { data: access } = await supabase.from('member_courses').select('course_id').eq('member_id', user.id)
    courseIds = (access ?? []).map((a) => a.course_id)
  }

  const results: SearchResult[] = []

  // Courses
  const coursesQ = supabase.from('courses').select('id, name').eq('is_published', true).ilike('name', `%${q}%`).limit(4)
  const { data: courses } = isAdmin ? await coursesQ : courseIds.length > 0 ? await coursesQ.in('id', courseIds) : { data: [] }
  for (const c of courses ?? []) {
    results.push({ type: 'curso', id: c.id, title: c.name, href: '/dashboard/cursos' })
  }

  // Lessons via modules
  const modsQ = supabase.from('modules').select('id, course_id, courses(name)').eq('is_published', true)
  const { data: mods } = isAdmin ? await modsQ : courseIds.length > 0 ? await modsQ.in('course_id', courseIds) : { data: [] }
  const modIds = (mods ?? []).map((m) => m.id)
  const modMap = Object.fromEntries((mods ?? []).map((m) => [m.id, { courseName: (m.courses as { name: string } | null)?.name ?? '' }]))

  if (modIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, module_id')
      .eq('is_published', true)
      .in('module_id', modIds)
      .ilike('title', `%${q}%`)
      .limit(7)
    for (const l of lessons ?? []) {
      results.push({
        type: 'aula',
        id: l.id,
        title: l.title,
        subtitle: modMap[l.module_id]?.courseName,
        href: `/dashboard/aulas/${l.id}`,
      })
    }
  }

  return results
}
