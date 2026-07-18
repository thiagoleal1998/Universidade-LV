'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type Notification = {
  id: string
  type: string
  title: string
  body: string
  link: string
  read_at: string | null
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
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
    .select('id, type, title, body, link, read_at, created_at')
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

  const { data: memberships } = await adminClient
    .from('member_courses')
    .select('user_id')
    .eq('course_id', courseId)

  if (!memberships?.length) return

  await adminClient.from('notifications').insert(
    memberships.map((m) => ({ user_id: m.user_id, ...opts }))
  )
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
