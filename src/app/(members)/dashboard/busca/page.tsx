import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, BookOpen, PlayCircle } from 'lucide-react'

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profileData?.role === 'admin'

  let courses: { id: string; name: string }[] = []
  let lessons: { id: string; title: string; moduleName: string; courseName: string }[] = []

  if (query.length >= 2) {
    let courseIds: string[] = []

    if (!isAdmin) {
      const { data: access } = await supabase.from('member_courses').select('course_id').eq('member_id', user!.id)
      courseIds = (access ?? []).map((a) => a.course_id)
    }

    const coursesQuery = supabase.from('courses').select('id, name').eq('is_published', true).ilike('name', `%${query}%`).limit(8)
    const coursesResult = isAdmin ? await coursesQuery : courseIds.length > 0 ? await coursesQuery.in('id', courseIds) : { data: [] }
    courses = (coursesResult.data ?? []) as { id: string; name: string }[]

    // Get modules for accessible courses
    const modsQuery = supabase.from('modules').select('id, title, course_id, courses(name)').eq('is_published', true)
    const modsResult = isAdmin ? await modsQuery : courseIds.length > 0 ? await modsQuery.in('course_id', courseIds) : { data: [] }
    const mods = (modsResult.data ?? []) as { id: string; title: string; course_id: string; courses: { name: string } | null }[]
    const modMap = Object.fromEntries(mods.map((m) => [m.id, { moduleName: m.title, courseName: m.courses?.name ?? '' }]))
    const modIds = mods.map((m) => m.id)

    if (modIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, module_id')
        .eq('is_published', true)
        .in('module_id', modIds)
        .ilike('title', `%${query}%`)
        .limit(20)

      lessons = (lessonsData ?? []).map((l) => ({
        id: l.id,
        title: l.title,
        moduleName: modMap[l.module_id]?.moduleName ?? '',
        courseName: modMap[l.module_id]?.courseName ?? '',
      }))
    }
  }

  const hasResults = courses.length > 0 || lessons.length > 0

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Buscar</h1>
        <p className="text-sm text-muted-foreground mt-1">Encontre cursos e aulas rapidamente.</p>
      </div>

      <form method="GET" className="relative mb-8">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar aulas ou cursos..."
          autoFocus
          autoComplete="off"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground">Digite pelo menos 2 caracteres.</p>
      )}

      {query.length >= 2 && !hasResults && (
        <div className="text-center py-16 bg-card border rounded-xl">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">Nenhum resultado para &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-muted-foreground mt-1">Tente palavras diferentes ou mais curtas.</p>
        </div>
      )}

      {courses.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cursos</p>
          <div className="space-y-2">
            {courses.map((c) => (
              <Link
                key={c.id}
                href="/dashboard/cursos"
                className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lessons.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Aulas</p>
          <div className="space-y-2">
            {lessons.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/aulas/${l.id}`}
                className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <PlayCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{l.title}</p>
                  {(l.moduleName || l.courseName) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[l.courseName, l.moduleName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!query && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Digite algo para buscar entre seus cursos e aulas.</p>
        </div>
      )}
    </div>
  )
}
