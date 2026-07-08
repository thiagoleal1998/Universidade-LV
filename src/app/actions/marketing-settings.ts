'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function upsertSetting(key: string, value: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) return { error: error.message }
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function saveTamojuntoWinners(formData: FormData) {
  const value = (formData.get('tamojunto_winners') as string) || '{}'
  return upsertSetting('tamojunto_winners', value)
}

export async function savePodviajar(formData: FormData) {
  const value = (formData.get('podviajar') as string) || '{}'
  return upsertSetting('podviajar', value)
}

export async function saveCorridaVendas(formData: FormData) {
  const value = (formData.get('corrida_vendas') as string) || '{}'
  return upsertSetting('corrida_vendas', value)
}
