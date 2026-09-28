'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

const HEX_RE = /^#[0-9a-fA-F]{6}$/
// Só regex própria (não importa de color-picker.tsx, um módulo 'use client')
// pra manter este arquivo server-only limpo de dependência de UI — mesmo
// racional já documentado pra COMMENT_MAX_LENGTH: valor compartilhado entre
// server action e cliente vai num módulo neutro, nunca puxado de um lado pro
// outro. Aqui os dois lados só precisam da MESMA regra, não do mesmo código.
function resolveLogoBgColor(raw: string): string {
  const trimmed = raw.trim()
  return HEX_RE.test(trimmed) ? trimmed : '#ffffff'
}

export type CommercialCondition = {
  id: string
  title: string
  description: string
  cover_url: string
  logo_url: string
  logo_bg_color: string
  url: string
  is_active: boolean
  expires_at: string | null
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
    logo_url: ((formData.get('logo_url') as string) ?? '').trim(),
    logo_bg_color: resolveLogoBgColor((formData.get('logo_bg_color') as string) ?? ''),
    url: ((formData.get('url') as string) ?? '').trim(),
    is_active: formData.get('is_active') === 'true',
    expires_at: (formData.get('expires_at') as string) || null,
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
    .select('title, description, cover_url, logo_url, logo_bg_color, url, is_active, expires_at')
    .eq('id', id)
    .single()

  const after = {
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    logo_url: ((formData.get('logo_url') as string) ?? '').trim(),
    logo_bg_color: resolveLogoBgColor((formData.get('logo_bg_color') as string) ?? ''),
    url: ((formData.get('url') as string) ?? '').trim(),
    is_active: formData.get('is_active') === 'true',
    expires_at: (formData.get('expires_at') as string) || null,
  }
  const { error } = await adminClient.from('commercial_conditions').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', logo_url: 'logo', logo_bg_color: 'cor de fundo da logo', url: 'link', is_active: 'ativação', expires_at: 'validade',
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
  let webpFile: File
  try {
    // sharp (dentro de toWebP) lança exceção síncrona/rejeitada pra imagem
    // corrompida/malformada — sem o try/catch, isso derruba a Server Action
    // inteira em vez de virar um toast de erro normal (mesma classe de bug
    // já corrigida em uploadFamtourCover/uploadTrainingCover/uploadMarketingFile).
    webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const path = `commercial-condition-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

// Logo do hotel/parceiro — separada da capa (foto ilustrativa): resize menor
// (400px), já que é exibida pequena por cima da capa, nunca em tela cheia.
export async function uploadCommercialConditionLogo(file: File) {
  const ctx = await requireCapability('comercial')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const path = `commercial-condition-logos/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: 'image/webp' })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
