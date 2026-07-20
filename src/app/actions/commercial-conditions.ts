'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export type CommercialCondition = {
  id: string
  title: string
  description: string
  cover_url: string
  url: string
  is_active: boolean
  owner_area_id: string | null
  created_at: string
}

// Guard de posse: colaborador só mexe em condição da própria área
async function requireCommercialConditionAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('commercial_conditions').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Condição comercial não encontrada.' }
  return requireContentAccess('comercial', item.owner_area_id)
}

export async function createCommercialCondition(formData: FormData) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o título da condição comercial.' }

  const adminClient = createAdminClient()
  const { data: inserted, error } = await adminClient.from('commercial_conditions').insert({
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    is_active: formData.get('is_active') === 'true',
    owner_area_id: ctx.areaId,
  }).select('id').single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'condicao_comercial', entityId: inserted?.id, entityLabel: title })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/comercial')
  return { success: true }
}

export async function updateCommercialCondition(id: string, formData: FormData) {
  const ctx = await requireCommercialConditionAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o título da condição comercial.' }

  const adminClient = createAdminClient()
  const { data: prev } = await adminClient
    .from('commercial_conditions')
    .select('title, description, cover_url, url, is_active')
    .eq('id', id)
    .single()

  const after = {
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    is_active: formData.get('is_active') === 'true',
  }
  const { error } = await adminClient.from('commercial_conditions').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', url: 'link', is_active: 'ativação',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'condicao_comercial', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/comercial')
  return { success: true }
}

export async function toggleCommercialConditionActive(id: string, active: boolean) {
  const ctx = await requireCommercialConditionAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('commercial_conditions').select('title').eq('id', id).single()
  const { error } = await adminClient.from('commercial_conditions').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'condicao_comercial', entityId: id, entityLabel: item?.title ?? id, detail: active ? 'ativou' : 'desativou' })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/comercial')
  return { success: true }
}

export async function deleteCommercialCondition(id: string) {
  const ctx = await requireCommercialConditionAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('commercial_conditions').select('title').eq('id', id).single()
  const { error } = await adminClient.from('commercial_conditions').delete().eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'condicao_comercial', entityId: id, entityLabel: item?.title ?? id })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/comercial')
  return { success: true }
}

export async function uploadCommercialConditionCover(file: File) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const path = `commercial-condition-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
