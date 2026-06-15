'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTag(formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  const color = (formData.get('color') as string) || 'blue'
  if (!name) return { error: 'Nome obrigatório' }
  const { error } = await supabase.from('tags').insert({ name, color })
  if (error) return { error: error.message }
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateTag(tagId: string, name: string, color: string) {
  const supabase = await createClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await supabase
    .from('tags')
    .update({ name: name.trim(), color })
    .eq('id', tagId)
  if (error) return { error: error.message }
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function assignMemberTags(memberId: string, tagIds: string[]) {
  const supabase = await createClient()
  await supabase.from('profile_tags').delete().eq('profile_id', memberId)
  if (tagIds.length > 0) {
    await supabase
      .from('profile_tags')
      .insert(tagIds.map((tag_id) => ({ profile_id: memberId, tag_id })))
  }
  revalidatePath('/admin/membros')
  return { success: true }
}
