'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

export type FaqItem = {
  id: string
  question: string
  answer: string
  order_index: number
  is_active: boolean
  created_at: string
}

export async function getFaqItems(): Promise<FaqItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('faq_items')
    .select('*')
    .order('order_index')
  return (data ?? []) as FaqItem[]
}

export async function createFaqItem(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const question = formData.get('question') as string
  const answer = formData.get('answer') as string
  if (!question?.trim() || !answer?.trim()) return { error: 'Preencha todos os campos.' }

  const { data: existing } = await supabase
    .from('faq_items')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
  const order_index = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

  const { data: inserted, error } = await supabase.from('faq_items').insert({ question: question.trim(), answer: answer.trim(), order_index }).select('id').single()
  if (error) return { error: error.message }
  logActivity(authz, { action: 'create', entityType: 'faq', entityId: inserted?.id, entityLabel: question.trim() })
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function updateFaqItem(id: string, formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const question = formData.get('question') as string
  const answer = formData.get('answer') as string
  if (!question?.trim() || !answer?.trim()) return { error: 'Preencha todos os campos.' }

  const { error } = await supabase.from('faq_items').update({ question: question.trim(), answer: answer.trim() }).eq('id', id)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'update', entityType: 'faq', entityId: id, entityLabel: question.trim() })
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function toggleFaqItem(id: string, is_active: boolean) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: item } = await supabase.from('faq_items').select('question').eq('id', id).single()
  const { error } = await supabase.from('faq_items').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'toggle', entityType: 'faq', entityId: id, entityLabel: item?.question ?? id, detail: is_active ? 'ativou' : 'desativou' })
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function deleteFaqItem(id: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: item } = await supabase.from('faq_items').select('question').eq('id', id).single()
  const { error } = await supabase.from('faq_items').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'delete', entityType: 'faq', entityId: id, entityLabel: item?.question ?? id })
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function reorderFaqItems(ids: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  await Promise.all(ids.map((id, i) => supabase.from('faq_items').update({ order_index: i }).eq('id', id)))
  logActivity(authz, { action: 'reorder', entityType: 'faq', entityLabel: 'Perguntas frequentes', detail: `reordenou ${ids.length} itens` })
  revalidatePath('/admin/faq')
  return { success: true }
}
