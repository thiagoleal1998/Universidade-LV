'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailAdminNewFeedback } from '@/lib/email'
import { toOne } from '@/lib/supabase/relations'

export type FeedbackReport = {
  id: string
  user_id: string
  type: 'bug' | 'suggestion'
  message: string
  page_url: string
  status: 'open' | 'resolved'
  admin_note: string
  resolved_at: string | null
  created_at: string
  member_name: string
}

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const type = formData.get('type') as string
  const message = (formData.get('message') as string)?.trim()
  const page_url = (formData.get('page_url') as string) || ''

  if (!message) return { error: 'Descreva o problema ou sugestão.' }
  if (!['bug', 'suggestion'].includes(type)) return { error: 'Tipo inválido.' }

  const { error } = await supabase.from('feedback_reports').insert({
    user_id: user.id, type, message, page_url,
  })
  if (error) return { error: error.message }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).single()
  emailAdminNewFeedback(profile?.full_name ?? '', user.email ?? '', type, message)

  return { success: true }
}

export async function getFeedbackReports(): Promise<FeedbackReport[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('feedback_reports')
    .select('id, user_id, type, message, page_url, status, admin_note, resolved_at, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })

  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    message: r.message,
    page_url: r.page_url,
    status: r.status,
    admin_note: r.admin_note,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
    member_name: toOne(r.profiles as { full_name: string }[] | { full_name: string } | null)?.full_name ?? '',
  }))
}

export async function resolveFeedback(id: string, resolved: boolean, adminNote?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('feedback_reports').update({
    status: resolved ? 'resolved' : 'open',
    resolved_at: resolved ? new Date().toISOString() : null,
    ...(adminNote !== undefined ? { admin_note: adminNote } : {}),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/feedback')
  return { success: true }
}
