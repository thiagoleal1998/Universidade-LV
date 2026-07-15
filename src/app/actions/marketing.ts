'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { extractYouTubeId } from '@/lib/youtube'

export type MarketingCategory = string

export type MarketingProduct = {
  id: string
  name: string
  created_at: string
}

export type MarketingPeriod = {
  id: string
  name: string
  created_at: string
}

export async function getMarketingProducts(): Promise<MarketingProduct[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('marketing_products').select('*').order('name')
  return (data ?? []) as MarketingProduct[]
}

export async function createMarketingProduct(name: string) {
  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_products').insert({ name: name.trim() })
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function updateMarketingProduct(id: string, name: string) {
  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_products').update({ name: name.trim() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingProduct(id: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('marketing_products').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function getMarketingPeriods(): Promise<MarketingPeriod[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('marketing_periods').select('*').order('name')
  return (data ?? []) as MarketingPeriod[]
}

export async function createMarketingPeriod(name: string) {
  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_periods').insert({ name: name.trim() })
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingPeriod(id: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('marketing_periods').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function createMarketingItem(data: {
  category: MarketingCategory
  title: string
  description: string
  content: string
  url: string
  audience?: string
  scope?: string
  product_id?: string
  period_id?: string
  travel_period?: string
  status?: string
  publish_at?: string
  expires_at?: string
  allowed_tag_ids?: string[]
}) {
  const supabase = await createClient()
  if (!data.title.trim()) return { error: 'Título obrigatório' }

  const { data: existing } = await supabase
    .from('marketing_items')
    .select('order_index')
    .eq('category', data.category)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase.from('marketing_items').insert({
    category: data.category,
    title: data.title.trim(),
    description: data.description.trim(),
    content: data.content,
    url: data.url.trim(),
    audience: data.audience || null,
    scope: data.scope || null,
    product_id: data.product_id || null,
    period_id: data.period_id || null,
    travel_period: data.travel_period?.trim() || null,
    status: data.status || 'published',
    publish_at: data.publish_at || ((data.status ?? 'published') === 'published' ? new Date().toISOString() : null),
    expires_at: data.expires_at || null,
    allowed_tag_ids: data.allowed_tag_ids ?? [],
    order_index: nextIndex,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function updateMarketingItem(
  id: string,
  data: {
    title: string
    description: string
    content: string
    url: string
    audience?: string
    scope?: string
    product_id?: string
    period_id?: string
    travel_period?: string
    status?: string
    publish_at?: string
    expires_at?: string
    allowed_tag_ids?: string[]
  },
) {
  const supabase = await createClient()
  if (!data.title.trim()) return { error: 'Título obrigatório' }

  const { error } = await supabase
    .from('marketing_items')
    .update({
      title: data.title.trim(),
      description: data.description.trim(),
      content: data.content,
      url: data.url.trim(),
      audience: data.audience || null,
      scope: data.scope || null,
      product_id: data.product_id || null,
      period_id: data.period_id || null,
      travel_period: data.travel_period?.trim() || null,
      status: data.status || 'published',
      publish_at: data.publish_at || ((data.status ?? 'published') === 'published' ? new Date().toISOString() : null),
      expires_at: data.expires_at || null,
      allowed_tag_ids: data.allowed_tag_ids ?? [],
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('marketing_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function uploadMarketingFile(file: File) {
  const adminClient = createAdminClient()
  const outFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const isConverted = outFile.type === 'image/webp'
  const ext = isConverted ? 'webp' : file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, outFile, { contentType: outFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

export type YoutubeEpisodeMetadata = { title: string; description: string; cover_url: string }

// Busca título (oEmbed), capa (thumbnail) e descrição (meta tag) de um vídeo do YouTube.
// Não depende de chave de API — usa o endpoint público de oEmbed e a meta description da página.
export async function fetchYoutubeEpisodeMetadata(
  url: string
): Promise<{ success: true; data: YoutubeEpisodeMetadata } | { error: string }> {
  const videoId = extractYouTubeId((url || '').trim())
  if (!videoId) return { error: 'Cole um link válido do YouTube (youtube.com/watch?v=... ou youtu.be/...).' }

  let title = ''
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    )
    if (!oembedRes.ok) return { error: 'Vídeo não encontrado no YouTube. Verifique o link.' }
    const oembed = (await oembedRes.json()) as { title?: string }
    title = oembed.title ?? ''
  } catch {
    return { error: 'Não foi possível conectar ao YouTube. Tente novamente.' }
  }

  let description = ''
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const match = html.match(/<meta name="description" content="([^"]*)"/)
      if (match) {
        description = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
      }
    }
  } catch {
    // descrição é best-effort — segue sem ela se falhar
  }

  let cover_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  try {
    const imgRes = await fetch(cover_url, { method: 'HEAD' })
    if (!imgRes.ok) cover_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  } catch {
    cover_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }

  return { success: true, data: { title, description, cover_url } }
}
