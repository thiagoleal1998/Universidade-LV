'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

export async function createTag(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  const color = (formData.get('color') as string) || 'blue'
  if (!name) return { error: 'Nome obrigatório' }
  const { error } = await supabase.from('tags').insert({ name, color })
  if (error) return { error: error.message }
  logActivity(authz, { action: 'create', entityType: 'tag', entityLabel: name })
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function deleteTag(tagId: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: tag } = await supabase.from('tags').select('name').eq('id', tagId).single()
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'delete', entityType: 'tag', entityId: tagId, entityLabel: tag?.name ?? tagId })
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateTag(tagId: string, name: string, color: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await supabase
    .from('tags')
    .update({ name: name.trim(), color })
    .eq('id', tagId)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'update', entityType: 'tag', entityId: tagId, entityLabel: name.trim() })
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function assignMemberTags(memberId: string, tagIds: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', memberId).single()
  await supabase.from('profile_tags').delete().eq('profile_id', memberId)
  if (tagIds.length > 0) {
    await supabase
      .from('profile_tags')
      .insert(tagIds.map((tag_id) => ({ profile_id: memberId, tag_id })))
  }
  logActivity(authz, { action: 'update', entityType: 'membro', entityId: memberId, entityLabel: profile?.full_name || memberId, detail: `alterou: tags (${tagIds.length})` })
  revalidatePath('/admin/membros')
  return { success: true }
}
