'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminContext } from '@/lib/authz'
import { PREVIEW_COOKIE } from '@/lib/preview'

// Modo prévia é só navegação/rótulo — nenhum guard de mutação (requireAdmin,
// requireCapability, etc.) lê esse cookie, então não abre brecha nenhuma.
export async function setCollaboratorPreview(on: boolean) {
  const ctx = await getAdminContext()
  if (!ctx || ctx.role !== 'admin') return { error: 'Apenas admins podem usar o modo prévia.' }

  const jar = await cookies()
  if (on) jar.set(PREVIEW_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/' })
  else jar.delete(PREVIEW_COOKIE)

  revalidatePath('/admin', 'layout')
  return { success: true }
}
