'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { rdCourseContentPublished } from '@/lib/rdstation'

export type Notification = {
  id: string
  type: string
  title: string
  body: string
  link: string
  read_at: string | null
  created_at: string
  area_tag?: string | null
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at, area_tag')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as Notification[]
}

// Usado pelo polling de reforço do som de notificação (Realtime nem sempre
// entrega o evento de forma confiável — isso funciona como garantia).
export async function getRecentSoundNotifications(sinceISO: string, types: string[]): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at, area_tag')
    .eq('user_id', user.id)
    .in('type', types)
    .gt('created_at', sinceISO)
    .order('created_at', { ascending: true })
    .limit(20)

  return (data ?? []) as Notification[]
}

export async function markNotificationsByTypeRead(type: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  await adminClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('type', type)
    .is('read_at', null)

  revalidatePath('/dashboard/documentos', 'layout')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  await adminClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

// Notify all active members — used by announcements
export async function notifyAllMembers(opts: {
  type: string
  title: string
  body: string
  link: string
}) {
  const adminClient = createAdminClient()

  // Colaboradores também estudam — recebem os mesmos avisos que membros
  const { data: members } = await adminClient
    .from('profiles')
    .select('id')
    .in('role', ['member', 'collaborator'])
    .eq('active', true)

  if (!members?.length) return

  await adminClient.from('notifications').insert(
    members.map((m) => ({ user_id: m.id, ...opts }))
  )
}

// Notify members with access to a specific course — used by lessons
export async function notifyCourseMembers(
  courseId: string,
  opts: { type: string; title: string; body: string; link: string }
) {
  const adminClient = createAdminClient()

  // Coluna é member_id (ver migração 012) — não user_id.
  const { data: memberships } = await adminClient
    .from('member_courses')
    .select('member_id')
    .eq('course_id', courseId)

  if (!memberships?.length) return

  await adminClient.from('notifications').insert(
    memberships.map((m) => ({ user_id: m.member_id, ...opts }))
  )

  const memberIds = new Set(memberships.map((m) => m.member_id))
  const { data: usersData } = await adminClient.auth.admin.listUsers()
  const emails = (usersData?.users ?? [])
    .filter((u) => memberIds.has(u.id) && u.email)
    .map((u) => u.email!)
  rdCourseContentPublished(emails, opts.title, opts.body, opts.link)
}

// Notify a single user — used by community replies
export async function notifyUser(
  userId: string,
  opts: { type: string; title: string; body: string; link: string }
) {
  const adminClient = createAdminClient()
  await adminClient.from('notifications').insert({ user_id: userId, ...opts })
}

// Notify all admins except the actor — used by community events
export async function notifyAllAdmins(
  actorId: string,
  opts: { type: string; title: string; body: string; link: string }
) {
  const adminClient = createAdminClient()

  const { data: admins } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .neq('id', actorId)

  if (!admins?.length) return

  await adminClient.from('notifications').insert(
    admins.map((a) => ({ user_id: a.id, ...opts }))
  )
}

// Notify collaborators who own a course (capacidade 'courses' + área dona do
// curso) — sempre notifica admins também, com area_tag = nome da área quando
// havia um dono, pra marcar visualmente "isso veio de uma área de colaborador"
// (cópia pro admin). Curso sem dono (owner_area_id null) cai no mesmo
// comportamento de notifyAllAdmins de sempre (sem area_tag).
export async function notifyCourseOwners(
  courseId: string | null,
  actorId: string,
  opts: { type: string; title: string; body: string; link: string }
) {
  const adminClient = createAdminClient()

  let ownerAreaName: string | null = null
  if (courseId) {
    const { data: course } = await adminClient.from('courses').select('owner_area_id').eq('id', courseId).single()
    if (course?.owner_area_id) {
      const { data: area } = await adminClient
        .from('collaborator_areas')
        .select('id, name, capabilities')
        .eq('id', course.owner_area_id)
        .single()
      if (area?.capabilities?.includes('courses')) {
        ownerAreaName = area.name
        const { data: owners } = await adminClient
          .from('profiles')
          .select('id')
          .eq('collaborator_area_id', area.id)
          .eq('active', true)
          .neq('id', actorId)
        if (owners?.length) {
          await adminClient.from('notifications').insert(owners.map((o) => ({ user_id: o.id, ...opts })))
        }
      }
    }
  }

  const { data: admins } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .neq('id', actorId)

  if (!admins?.length) return

  await adminClient.from('notifications').insert(
    admins.map((a) => ({ user_id: a.id, ...opts, area_tag: ownerAreaName }))
  )
}

// IDs de chamados de feedback com notificação `feedback_update` não lida —
// usado pra desenhar o indicador "nova atualização" no card do chamado
// (my-feedback-list.tsx). O link já vem como `.../feedback?report=<id>`.
export async function getUnreadFeedbackUpdateReportIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notifications')
    .select('link')
    .eq('user_id', user.id)
    .eq('type', 'feedback_update')
    .is('read_at', null)

  const ids = new Set<string>()
  for (const n of data ?? []) {
    const match = n.link?.match(/report=([^&]+)/)
    if (match) ids.add(match[1])
  }
  return [...ids]
}

// Marca como lida a notificação `feedback_update` de UM chamado específico
// (não todas — abrir um chamado não deve limpar o indicador dos outros).
export async function markFeedbackReportNotificationRead(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  await adminClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('type', 'feedback_update')
    .ilike('link', `%report=${reportId}%`)
    .is('read_at', null)

  return { success: true }
}
