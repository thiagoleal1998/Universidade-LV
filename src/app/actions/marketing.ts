'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export type MarketingCategory = string

export type MarketingProduct = {
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

export async function deleteMarketingProduct(id: string) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('marketing_products').delete().eq('id', id)
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
  status?: string
  publish_at?: string
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
    status: data.status || 'published',
    publish_at: data.publish_at || null,
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
    status?: string
    publish_at?: string
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
      status: data.status || 'published',
      publish_at: data.publish_at || null,
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
