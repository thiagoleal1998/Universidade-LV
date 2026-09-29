'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export type CommercialBannerItem = {
  id: string
  partner_name: string
  condition_text: string
  logo_url: string
  order_index: number
  created_at: string
}

function revalidateAll() {
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/comercial')
  revalidatePath('/dashboard/comercial/campanha')
}

export async function createCommercialBannerItem(formData: FormData) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const partnerName = ((formData.get('partner_name') as string) ?? '').trim()
  if (!partnerName) return { error: 'Informe o nome do parceiro.' }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('commercial_banner_items')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)
  const order_index = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0

  const { data: inserted, error } = await adminClient.from('commercial_banner_items').insert({
    partner_name: partnerName,
    condition_text: ((formData.get('condition_text') as string) ?? '').trim(),
    logo_url: ((formData.get('logo_url') as string) ?? '').trim(),
    order_index,
  }).select('id').single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'condicao_comercial', entityId: inserted?.id, entityLabel: `Campanha: ${partnerName}` })
  revalidateAll()
  return { success: true }
}

export async function updateCommercialBannerItem(id: string, formData: FormData) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const partnerName = ((formData.get('partner_name') as string) ?? '').trim()
  if (!partnerName) return { error: 'Informe o nome do parceiro.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('commercial_banner_items').update({
    partner_name: partnerName,
    condition_text: ((formData.get('condition_text') as string) ?? '').trim(),
    logo_url: ((formData.get('logo_url') as string) ?? '').trim(),
  }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'update', entityType: 'condicao_comercial', entityId: id, entityLabel: `Campanha: ${partnerName}` })
  revalidateAll()
  return { success: true }
}

export async function deleteCommercialBannerItem(id: string) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('commercial_banner_items').select('partner_name').eq('id', id).single()
  const { error } = await adminClient.from('commercial_banner_items').delete().eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'condicao_comercial', entityId: id, entityLabel: `Campanha: ${item?.partner_name ?? id}` })
  revalidateAll()
  return { success: true }
}

// Lista pequena, sem posse por área — reordenar libera pra quem tem a
// capacidade 'comercial' (mesmo guard do banner), não admin-only como o
// reorder global de cursos/treinamentos (não há subconjunto por área aqui
// que um reorder parcial pudesse bagunçar).
export async function reorderCommercialBannerItems(ids: string[]) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  await Promise.all(ids.map((id, i) => adminClient.from('commercial_banner_items').update({ order_index: i }).eq('id', id)))
  logActivity(ctx, { action: 'reorder', entityType: 'condicao_comercial', entityLabel: 'Parceiros da campanha', detail: `reordenou ${ids.length} itens` })
  revalidateAll()
  return { success: true }
}

export async function uploadCommercialBannerItemLogo(file: File) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const path = `commercial-banner-item-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
