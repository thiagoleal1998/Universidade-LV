'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

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
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('tamojunto_winners') as string) || '{}'
  const result = await upsertSetting('tamojunto_winners', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'Vencedores TamoJunto' })
  return result
}

export async function savePodviajar(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('podviajar') as string) || '{}'
  const result = await upsertSetting('podviajar', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'PodViajar' })
  return result
}

export async function saveCorridaVendas(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('corrida_vendas') as string) || '{}'
  const result = await upsertSetting('corrida_vendas', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'Corrida de Vendas' })
  return result
}
