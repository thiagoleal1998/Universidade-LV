'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase.from('faq_items').insert({ question: question.trim(), answer: answer.trim(), order_index })
  if (error) return { error: error.message }
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function updateFaqItem(id: string, formData: FormData) {
  const supabase = await createClient()
  const question = formData.get('question') as string
  const answer = formData.get('answer') as string
  if (!question?.trim() || !answer?.trim()) return { error: 'Preencha todos os campos.' }

  const { error } = await supabase.from('faq_items').update({ question: question.trim(), answer: answer.trim() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function toggleFaqItem(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('faq_items').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function deleteFaqItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('faq_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/faq')
  return { success: true }
}

export async function reorderFaqItems(ids: string[]) {
  const supabase = await createClient()
  await Promise.all(ids.map((id, i) => supabase.from('faq_items').update({ order_index: i }).eq('id', id)))
  revalidatePath('/admin/faq')
  return { success: true }
}
