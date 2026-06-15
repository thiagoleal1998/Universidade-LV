import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called daily by Vercel Cron at 08:00 BRT (11:00 UTC).
// Sends bell notifications for:
//   • task period opens today
//   • task deadline in 3 days
//   • task deadline tomorrow
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function addDays(d: Date, n: number) {
    return new Date(d.getTime() + n * 86_400_000)
  }
  function fmt(d: Date) {
    return d.toISOString().slice(0, 10)
  }

  const todayStr  = fmt(today)
  const plus1Str  = fmt(addDays(today, 1))
  const plus3Str  = fmt(addDays(today, 3))

  type LessonRow = {
    id: string
    title: string
    modules: { course_id: string | null } | null
  }

  // Fetch the three sets of lessons
  const [{ data: opening }, { data: closingIn3 }, { data: closingTomorrow }] =
    await Promise.all([
      adminClient
        .from('lessons')
        .select('id, title, modules!inner(course_id)')
        .eq('task_start_date', todayStr)
        .eq('is_published', true),
      adminClient
        .from('lessons')
        .select('id, title, modules!inner(course_id)')
        .eq('task_end_date', plus3Str)
        .eq('is_published', true),
      adminClient
        .from('lessons')
        .select('id, title, modules!inner(course_id)')
        .eq('task_end_date', plus1Str)
        .eq('is_published', true),
    ])

  async function notifyLessonMembers(
    lessons: LessonRow[] | null,
    buildNotif: (lesson: LessonRow) => { type: string; title: string; body: string; link: string }
  ) {
    if (!lessons?.length) return 0
    let count = 0
    for (const lesson of lessons) {
      const courseId = lesson.modules?.course_id
      if (!courseId) continue

      const { data: memberships } = await adminClient
        .from('member_courses')
        .select('user_id')
        .eq('course_id', courseId)

      if (!memberships?.length) continue

      const notif = buildNotif(lesson)
      await adminClient.from('notifications').insert(
        memberships.map((m) => ({ user_id: m.user_id, ...notif }))
      )
      count += memberships.length
    }
    return count
  }

  const [n1, n2, n3] = await Promise.all([
    notifyLessonMembers(opening as LessonRow[] | null, (l) => ({
      type: 'task_opened',
      title: `Tarefa disponível: ${l.title}`,
      body: 'O período de envio desta tarefa foi aberto. Não perca o prazo!',
      link: `/dashboard/aulas/${l.id}`,
    })),
    notifyLessonMembers(closingIn3 as LessonRow[] | null, (l) => ({
      type: 'task_closing_soon',
      title: `Prazo em 3 dias: ${l.title}`,
      body: 'Você tem 3 dias para enviar a tarefa desta aula.',
      link: `/dashboard/aulas/${l.id}`,
    })),
    notifyLessonMembers(closingTomorrow as LessonRow[] | null, (l) => ({
      type: 'task_closing_tomorrow',
      title: `Tarefa encerra amanhã: ${l.title}`,
      body: 'Último dia para enviar a tarefa desta aula. Não deixe para depois!',
      link: `/dashboard/aulas/${l.id}`,
    })),
  ])

  return NextResponse.json({
    ok: true,
    notified: { taskOpened: n1, closingIn3: n2, closingTomorrow: n3 },
  })
}
