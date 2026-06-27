'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SEO_KEYS = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'seo_og_image',
  'seo_canonical_url',
  'seo_google_verification',
  'seo_robots',
  'seo_author',
  'aeo_featured_snippet',
  'aeo_faq',
  'geo_business_description',
  'geo_target_audience',
  'geo_key_facts',
] as const

export async function saveSeoSettings(formData: FormData) {
  const supabase = await createClient()

  const upserts = SEO_KEYS.map((key) => ({
    key,
    value: (formData.get(key) as string | null) ?? '',
  }))

  const { error } = await supabase
    .from('site_settings')
    .upsert(upserts, { onConflict: 'key' })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
