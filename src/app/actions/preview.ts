'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import { PREVIEW_COOKIE } from '@/lib/preview'

// Modo prévia é simulação de VISUALIZAÇÃO por área (o cookie guarda o id da
// collaborator_area escolhida) — usado só por getPreviewAreaContext() pra
// calcular canEdit/canCreate/canModerate nas telas de conteúdo. Nenhum guard
// de mutação (requireAdmin, requireCapability, requireCourseAccess etc.) lê
// esse cookie, então não abre brecha nenhuma: o admin real sempre edita tudo
// ao chamar uma action, mesmo com a prévia ativa — a prévia só afeta o que a
// TELA mostra/esconde.
export async function setCollaboratorPreview(areaId: string | null) {
  const ctx = await getAdminContext()
  if (!ctx || ctx.role !== 'admin') return { error: 'Apenas admins podem usar o modo prévia.' }

  const jar = await cookies()
  if (areaId) {
    const adminClient = createAdminClient()
    const { data: area } = await adminClient.from('collaborator_areas').select('id').eq('id', areaId).single()
    if (!area) return { error: 'Área não encontrada.' }
    jar.set(PREVIEW_COOKIE, areaId, { httpOnly: true, sameSite: 'lax', path: '/' })
  } else {
    jar.delete(PREVIEW_COOKIE)
  }

  revalidatePath('/admin', 'layout')
  return { success: true }
}
