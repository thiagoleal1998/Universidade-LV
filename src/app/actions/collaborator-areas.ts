'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/authz'
import { CAPABILITIES, type Capability } from '@/lib/capabilities'
import { revalidatePath } from 'next/cache'

export type CollaboratorArea = {
  id: string
  name: string
  capabilities: Capability[]
  created_at: string
}

function sanitizeCapabilities(caps: string[]): Capability[] {
  return caps.filter((c): c is Capability => (CAPABILITIES as readonly string[]).includes(c))
}

export async function getCollaboratorAreas(): Promise<CollaboratorArea[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('collaborator_areas').select('*').order('name')
  return (data ?? []) as CollaboratorArea[]
}

export async function createCollaboratorArea(name: string, capabilities: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Dê um nome para a área.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('collaborator_areas')
    .insert({ name: trimmed, capabilities: sanitizeCapabilities(capabilities) })
  if (error) return { error: error.message }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateCollaboratorArea(id: string, name: string, capabilities: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Dê um nome para a área.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('collaborator_areas')
    .update({ name: trimmed, capabilities: sanitizeCapabilities(capabilities) })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function deleteCollaboratorArea(id: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const adminClient = createAdminClient()
  // FKs são ON DELETE SET NULL: colaboradores da área ficam sem área (perdem
  // acesso ao painel) e o conteúdo vira global (do admin).
  const { error } = await adminClient.from('collaborator_areas').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/membros')
  return { success: true }
}
