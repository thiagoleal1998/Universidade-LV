'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireCapability } from '@/lib/authz'
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

// As 3 settings globais abaixo (Premiação/PodViajar/Corrida de Vendas) eram
// admin-only de propósito (settings-JSON não suporta posse por área — ver
// CLAUDE.md). A partir daqui, colaboradores com a capacidade `marketing`
// também podem editar as 3, já que são materiais de divulgação/marketing —
// mesmo padrão de guard usado no resto do conteúdo (requireCapability).
export async function saveTamojuntoWinners(formData: FormData) {
  const authz = await requireCapability('marketing')
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('tamojunto_winners') as string) || '{}'
  const result = await upsertSetting('tamojunto_winners', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'Vencedores TamoJunto' })
  return result
}

export async function savePodviajar(formData: FormData) {
  const authz = await requireCapability('marketing')
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('podviajar') as string) || '{}'
  const result = await upsertSetting('podviajar', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'PodViajar' })
  return result
}

export async function saveCorridaVendas(formData: FormData) {
  const authz = await requireCapability('marketing')
  if ('error' in authz) return { error: authz.error }

  const value = (formData.get('corrida_vendas') as string) || '{}'
  const result = await upsertSetting('corrida_vendas', value)
  if ('success' in result) logActivity(authz,{ action: 'update', entityType: 'premiacao', entityLabel: 'Corrida de Vendas' })
  return result
}
