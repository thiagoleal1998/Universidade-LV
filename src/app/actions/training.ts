'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { emailNewTraining } from '@/lib/email'
import { getSettings } from '@/lib/settings'

// Guard de posse: colaborador só mexe em treinamento da própria área
async function requireTrainingAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Treinamento não encontrado.' }
  return requireContentAccess('trainings', item.owner_area_id)
}

function formatLiveAt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export type NotifyResult = { notified: number } | { error: string; memberCount: number }

async function notifyMembers(payload: {
  id: string
  title: string
  notifType: 'new_training' | 'training_replay'
  notifTitle: string
  body: string
}): Promise<NotifyResult> {
  const adminClient = createAdminClient()

  const { data: members, error: membersErr } = await adminClient
    .from('profiles')
    .select('id')
    .in('role', ['member', 'collaborator'])
    .eq('active', true)

  if (membersErr) return { error: membersErr.message, memberCount: 0 }
  if (!members?.length) return { error: 'no_members', memberCount: 0 }

  const link = `/dashboard/treinamentos/${payload.id}`
  const { error: insertErr } = await adminClient.from('notifications').insert(
    members.map((m) => ({
      user_id: m.id,
      type: payload.notifType,
      title: payload.notifTitle,
      body: payload.body,
      link,
    }))
  )

  if (insertErr) return { error: insertErr.message, memberCount: members.length }

  const memberIds = new Set(members.map((m) => m.id))
  const [{ data: usersData }, settings] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    getSettings(),
  ])
  const emails = (usersData?.users ?? [])
    .filter((u) => memberIds.has(u.id) && u.email)
    .map((u) => u.email!)
  emailNewTraining(emails, payload.notifTitle, payload.body, link, settings.site_name)

  return { notified: members.length }
}

async function notifyNewTraining(item: { id: string; title: string; type: string; live_at: string | null }): Promise<NotifyResult> {
  const isLive = item.type === 'live'
  const date = isLive ? formatLiveAt(item.live_at) : null
  return notifyMembers({
    id: item.id,
    title: item.title,
    notifType: 'new_training',
    notifTitle: isLive ? 'Novo treinamento ao vivo agendado' : 'Novo treinamento disponivel',
    body: date ? `${item.title} - ${date}` : item.title,
  })
}

async function notifyTrainingReplay(item: { id: string; title: string }): Promise<NotifyResult> {
  return notifyMembers({
    id: item.id,
    title: item.title,
    notifType: 'training_replay',
    notifTitle: 'Treinamento disponivel como replay',
    body: item.title,
  })
}

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
  owner_area_id?: string | null
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
  const ctx = await requireCapability('trainings')
  if ('error' in ctx) return { error: ctx.error }

  const isActive = formData.get('is_active') === 'true'
  const type = (formData.get('type') as string) || 'link'
  const liveAt = parseLiveAt(formData.get('live_at') as string | null)

  const adminClient = createAdminClient()
  const title = (formData.get('title') as string).trim()

  const { data: inserted, error } = await adminClient.from('training_items').insert({
    title,
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: isActive,
    type,
    live_at: liveAt,
    owner_area_id: ctx.areaId,
  }).select('id, title, type, live_at').single()

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'treinamento', entityId: inserted?.id, entityLabel: title })

  let notifyResult: NotifyResult | null = null
  if (isActive && inserted) {
    notifyResult = await notifyNewTraining(inserted)
    revalidatePath('/dashboard', 'layout')
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function updateTrainingItem(id: string, formData: FormData) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()

  const { data: prev } = await adminClient
    .from('training_items')
    .select('type, is_active, title, description, url, cover_url, order_index, live_at')
    .eq('id', id)
    .single()

  const newType = (formData.get('type') as string) || 'link'
  const newActive = formData.get('is_active') === 'true'
  const newTitle = (formData.get('title') as string).trim()

  const after = {
    title: newTitle,
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: newActive,
    type: newType,
    live_at: parseLiveAt(formData.get('live_at') as string | null),
  }
  const { error } = await adminClient.from('training_items').update(after).eq('id', id)

  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', url: 'link', cover_url: 'capa',
    order_index: 'ordem', is_active: 'ativação', type: 'tipo', live_at: 'data ao vivo',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'treinamento', entityId: id, entityLabel: newTitle, detail: `alterou: ${changed.join(', ')}` })
  }

  let notifyResult: NotifyResult | null = null
  const becameActive = !prev?.is_active && newActive
  const becameReplay = prev?.type !== 'replay' && newType === 'replay'
  const becameLive = prev?.type !== 'live' && newType === 'live' && newActive

  if (newActive && becameReplay) {
    const title = (formData.get('title') as string).trim() || prev?.title || ''
    notifyResult = await notifyTrainingReplay({ id, title })
    revalidatePath('/dashboard', 'layout')
  } else if (becameActive || becameLive) {
    const title = (formData.get('title') as string).trim() || prev?.title || ''
    const liveAt = parseLiveAt(formData.get('live_at') as string | null)
    notifyResult = await notifyNewTraining({ id, title, type: newType, live_at: liveAt })
    revalidatePath('/dashboard', 'layout')
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function toggleTrainingActive(id: string, is_active: boolean) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('title').eq('id', id).single()
  const { error } = await adminClient.from('training_items').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'treinamento', entityId: id, entityLabel: item?.title ?? id, detail: is_active ? 'ativou' : 'desativou' })

  let notifyResult: NotifyResult | null = null
  if (is_active) {
    const { data } = await adminClient
      .from('training_items')
      .select('id, title, type, live_at')
      .eq('id', id)
      .single()
    if (data) {
      notifyResult = await notifyNewTraining(data)
      revalidatePath('/dashboard', 'layout')
    }
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function deleteTrainingItem(id: string) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('title').eq('id', id).single()
  const { error } = await adminClient.from('training_items').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'treinamento', entityId: id, entityLabel: item?.title ?? id })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function uploadTrainingCover(file: File) {
  const ctx = await requireCapability('trainings')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const path = `training-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

export async function createTrainingMaterial(trainingId: string, formData: FormData) {
  const ctx = await requireTrainingAccess(trainingId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const materialTitle = (formData.get('title') as string).trim()
  const { error } = await adminClient.from('training_materials').insert({
    training_id: trainingId,
    title: materialTitle,
    url: (formData.get('url') as string).trim(),
    type: (formData.get('type') as string) || 'link',
    order_index: Number(formData.get('order_index') ?? 0),
  })

  if (error) return { error: error.message }
  logActivity(ctx, { action: 'create', entityType: 'material_treinamento', entityLabel: materialTitle, detail: `treinamento ${trainingId}` })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function deleteTrainingMaterial(id: string) {
  const adminClient = createAdminClient()
  const { data: material } = await adminClient.from('training_materials').select('training_id, title').eq('id', id).single()
  if (!material) return { error: 'Material não encontrado.' }

  const ctx = await requireTrainingAccess(material.training_id)
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await adminClient.from('training_materials').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'material_treinamento', entityId: id, entityLabel: material.title })
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

// Reorder é admin-only: a listagem do colaborador é parcial (só a área dele)
// e reordenar um subconjunto bagunçaria os índices globais.
export async function reorderTrainingItems(ids: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return

  const adminClient = createAdminClient()
  await Promise.all(
    ids.map((id, index) =>
      adminClient.from('training_items').update({ order_index: index }).eq('id', id)
    )
  )
  logActivity(auth, { action: 'reorder', entityType: 'treinamento', entityLabel: 'Treinamentos', detail: `reordenou ${ids.length} itens` })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
}
