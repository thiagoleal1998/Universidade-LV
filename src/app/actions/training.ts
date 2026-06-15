'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type TrainingMaterial = {
  id: string
  training_id: string
  title: string
  url: string
  type: string
  order_index: number
  created_at: string
}

export type TrainingItem = {
  id: string
  title: string
  description: string | null
  url: string
  cover_url: string | null
  order_index: number
  is_active: boolean
  type: 'link' | 'live' | 'replay'
  live_at: string | null
  created_at: string
  materials?: TrainingMaterial[]
}

export async function getTrainingItem(id: string): Promise<TrainingItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_items')
    .select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)')
    .eq('id', id)
    .single()

  if (error) {
    const { data: fallback } = await supabase.from('training_items').select('*').eq('id', id).single()
    return (fallback ?? null) as TrainingItem | null
  }
  return data as TrainingItem | null
}

export async function getTrainingItems(): Promise<TrainingItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_items')
    .select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)')
    .order('order_index')

  if (error) {
    const { data: fallback } = await supabase
      .from('training_items')
      .select('*')
      .order('order_index')
    return (fallback ?? []) as TrainingItem[]
  }

  return (data ?? []) as TrainingItem[]
}

function parseLiveAt(raw: string | null): string | null {
  if (!raw) return null
  // datetime-local gives "YYYY-MM-DDTHH:mm" — treat as Brazil time (UTC-3)
  return new Date(raw + ':00.000-03:00').toISOString()
}

export async function createTrainingItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_items').insert({
    title: (formData.get('title') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: formData.get('is_active') === 'true',
    type: (formData.get('type') as string) || 'link',
    live_at: parseLiveAt(formData.get('live_at') as string | null),
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function updateTrainingItem(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_items').update({
    title: (formData.get('title') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: formData.get('is_active') === 'true',  // null when unchecked → false
    type: (formData.get('type') as string) || 'link',
    live_at: parseLiveAt(formData.get('live_at') as string | null),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function toggleTrainingActive(id: string, is_active: boolean) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_items').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function deleteTrainingItem(id: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function uploadTrainingCover(file: File) {
  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const path = `training-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from('marketing-files').upload(path, file)
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

export async function createTrainingMaterial(trainingId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_materials').insert({
    training_id: trainingId,
    title: (formData.get('title') as string).trim(),
    url: (formData.get('url') as string).trim(),
    type: (formData.get('type') as string) || 'link',
    order_index: Number(formData.get('order_index') ?? 0),
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function deleteTrainingMaterial(id: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('training_materials').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function checkAndNotifyExpiredLive(items: TrainingItem[]) {
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000)
  const expired = items.filter(
    (i) => i.type === 'live' && i.is_active && i.live_at && new Date(i.live_at) < twoHoursAgo
  )
  if (!expired.length) return

  const adminClient = createAdminClient()
  const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
  if (!admins?.length) return

  for (const item of expired) {
    const link = `/admin/marketing?training=${item.id}`
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('type', 'training_live_expired')
      .eq('link', link)
      .limit(1)
    if (existing?.length) continue

    await adminClient.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: 'training_live_expired',
        title: 'Sessão ao vivo encerrada',
        body: `"${item.title}" terminou há mais de 2 horas. Atualize o link para replay.`,
        link,
      }))
    )
  }
}

export async function reorderTrainingItems(ids: string[]) {
  const adminClient = createAdminClient()
  await Promise.all(
    ids.map((id, index) =>
      adminClient.from('training_items').update({ order_index: index }).eq('id', id)
    )
  )
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
}
