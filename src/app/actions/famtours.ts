'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export type Famtour = {
  id: string
  title: string
  description: string
  cover_url: string
  url: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  owner_area_id: string | null
  created_at: string
}

// Guard de posse: colaborador só mexe em famtour da própria área
async function requireFamtourAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Famtour não encontrado.' }
  return requireContentAccess('famtours', item.owner_area_id)
}

export async function createFamtour(formData: FormData) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome/destino do famtour.' }

  const adminClient = createAdminClient()
  const { data: inserted, error } = await adminClient.from('famtours').insert({
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_active: formData.get('is_active') === 'true',
    owner_area_id: ctx.areaId,
  }).select('id').single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'famtour', entityId: inserted?.id, entityLabel: title })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateFamtour(id: string, formData: FormData) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome/destino do famtour.' }

  const adminClient = createAdminClient()
  const { data: prev } = await adminClient
    .from('famtours')
    .select('title, description, cover_url, url, start_date, end_date, is_active')
    .eq('id', id)
    .single()

  const after = {
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    is_active: formData.get('is_active') === 'true',
  }
  const { error } = await adminClient.from('famtours').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', url: 'link',
    start_date: 'data de início', end_date: 'data de fim', is_active: 'ativação',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'famtour', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleFamtourActive(id: string, active: boolean) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('title').eq('id', id).single()
  const { error } = await adminClient.from('famtours').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'famtour', entityId: id, entityLabel: item?.title ?? id, detail: active ? 'ativou' : 'desativou' })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteFamtour(id: string) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('title').eq('id', id).single()
  const { error } = await adminClient.from('famtours').delete().eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'famtour', entityId: id, entityLabel: item?.title ?? id })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadFamtourCover(file: File) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const path = `famtour-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
