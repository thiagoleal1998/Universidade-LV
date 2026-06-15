import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Verify requester is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  const [{ data: profiles }, { data: usersData }, { data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, active').eq('role', 'member'),
    adminClient.auth.admin.listUsers(),
    supabase.from('modules').select('id, title').order('order_index'),
    supabase.from('lessons').select('id, module_id, title, is_published'),
    supabase.from('member_progress').select('user_id, lesson_id, completed_at'),
  ])

  const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? '']))
  const moduleMap = new Map((modules ?? []).map((m) => [m.id, m.title]))
  const lessonMap = new Map((lessons ?? []).map((l) => [l.id, l]))
  const publishedLessons = (lessons ?? []).filter((l) => l.is_published)
  const totalPublished = publishedLessons.length

  // Build progress set per user
  const completedByUser = new Map<string, Set<string>>()
  for (const p of progress ?? []) {
    if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set())
    completedByUser.get(p.user_id)!.add(p.lesson_id)
  }

  const rows: string[][] = [
    ['Nome', 'Email', 'Status', 'Aulas Concluídas', 'Total Aulas', 'Progresso (%)'],
  ]

  for (const p of profiles ?? []) {
    const done = completedByUser.get(p.id)
    const completed = done ? publishedLessons.filter((l) => done.has(l.id)).length : 0
    const pct = totalPublished > 0 ? Math.round((completed / totalPublished) * 100) : 0
    rows.push([
      p.full_name || '',
      emailMap.get(p.id) ?? '',
      p.active ? 'Ativo' : 'Inativo',
      String(completed),
      String(totalPublished),
      `${pct}%`,
    ])
  }

  // Detail rows: one per completion
  const detailRows: string[][] = [
    [],
    ['--- Detalhamento de conclusões ---'],
    ['Nome', 'Email', 'Módulo', 'Aula', 'Concluída em'],
  ]
  const sortedProgress = [...(progress ?? [])].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )
  for (const p of sortedProgress) {
    const memberProfile = (profiles ?? []).find((m) => m.id === p.user_id)
    const lesson = lessonMap.get(p.lesson_id)
    if (!lesson) continue
    detailRows.push([
      memberProfile?.full_name || '',
      emailMap.get(p.user_id) ?? '',
      moduleMap.get(lesson.module_id) ?? '',
      lesson.title,
      new Date(p.completed_at).toLocaleString('pt-BR'),
    ])
  }

  const allRows = [...rows, ...detailRows]
  const csv = allRows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const date = new Date().toISOString().split('T')[0]
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-progresso-${date}.csv"`,
    },
  })
}
