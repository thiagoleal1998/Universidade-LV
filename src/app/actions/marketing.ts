'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export type MarketingCategory = 'visual' | 'link' | 'email' | 'script'

export async function createMarketingItem(data: {
  category: MarketingCategory
  title: string
  description: string
  content: string
  url: string
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
    ...data,
    title: data.title.trim(),
    description: data.description.trim(),
    url: data.url.trim(),
    order_index: nextIndex,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function updateMarketingItem(
  id: string,
  data: { title: string; description: string; content: string; url: string },
) {
  const supabase = await createClient()
  if (!data.title.trim()) return { error: 'Título obrigatório' }

  const { error } = await supabase
    .from('marketing_items')
    .update({ title: data.title.trim(), description: data.description.trim(), content: data.content, url: data.url.trim() })
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
  const supabase = await createClient()
  // toWebP retorna o file original se não for imagem raster (PDF, zip, SVG, etc.)
  const outFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const isConverted = outFile.type === 'image/webp'
  const ext = isConverted ? 'webp' : file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from('marketing-files').upload(path, outFile, { contentType: outFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
