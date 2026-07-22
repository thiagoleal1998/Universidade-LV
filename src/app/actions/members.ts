'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailMemberApproved, emailMemberRejected } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

export async function createMember(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) return { error: error.message }

  if (data.user) {
    await adminClient
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', data.user.id)
  }

  logActivity(authz, { action: 'create', entityType: 'membro', entityId: data.user?.id, entityLabel: fullName || email })

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMember(
  userId: string,
  data: {
    full_name: string
    email: string
    role: 'admin' | 'member' | 'collaborator'
    active: boolean
    new_password?: string
    collaborator_area_id?: string | null
    bio?: string
  }
) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const adminClient = createAdminClient()
  const supabase = await createClient()

  if (data.role === 'collaborator' && !data.collaborator_area_id) {
    return { error: 'Escolha a área do colaborador.' }
  }

  // Atualiza email e senha no auth (via admin API)
  const authUpdate: { email?: string; password?: string } = {}
  if (data.email) authUpdate.email = data.email
  if (data.new_password) authUpdate.password = data.new_password

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
    if (error) return { error: error.message }
  }

  // Atualiza nome, role, status e área no perfil (área só existe para colaborador)
  const { data: prevProfile } = await supabase
    .from('profiles')
    .select('full_name, role, active, collaborator_area_id')
    .eq('id', userId)
    .single()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      role: data.role,
      active: data.active,
      collaborator_area_id: data.role === 'collaborator' ? data.collaborator_area_id : null,
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
    })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  const changed: string[] = []
  if (prevProfile?.full_name !== data.full_name) changed.push('nome')
  if (prevProfile?.role !== data.role) changed.push('papel')
  if (prevProfile?.active !== data.active) changed.push('status')
  if (data.new_password) changed.push('senha')
  if (data.email) changed.push('e-mail')
  if (data.bio !== undefined) changed.push('bio')
  logActivity(authz, { action: 'update', entityType: 'membro', entityId: userId, entityLabel: data.full_name, detail: changed.length > 0 ? `alterou: ${changed.join(', ')}` : undefined })

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function deleteMember(userId: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', userId).single()

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  logActivity(authz, { action: 'delete', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId })

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function toggleMemberActive(userId: string, active: boolean) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ active })
    .eq('id', userId)

  if (error) return { error: error.message }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  logActivity(authz, { action: 'toggle', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: active ? 'ativou' : 'desativou' })

  // Envia email de boas-vindas quando aprovado
  if (active) {
    const { data: userData } = await adminClient.auth.admin.getUserById(userId)
    const settings = await getSettings()
    const email = userData.user?.email ?? ''
    if (email) emailMemberApproved(email, profile?.full_name ?? '', settings.site_name)
  }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMemberNotes(userId: string, notes: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  const { error } = await supabase
    .from('profiles')
    .update({ admin_notes: notes || null })
    .eq('id', userId)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'update', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: 'alterou: anotações internas' })
  return { success: true }
}

export async function assignMemberCourses(memberId: string, courseIds: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', memberId).single()
  const { error: delError } = await supabase
    .from('member_courses')
    .delete()
    .eq('member_id', memberId)
  if (delError) return { error: delError.message }
  if (courseIds.length > 0) {
    const { error } = await supabase
      .from('member_courses')
      .insert(courseIds.map((course_id) => ({ member_id: memberId, course_id })))
    if (error) return { error: error.message }
  }
  logActivity(authz, { action: 'update', entityType: 'membro', entityId: memberId, entityLabel: profile?.full_name || memberId, detail: `matriculou em ${courseIds.length} curso(s)` })
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function approveMember(userId: string, courseIds: string[]) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // rejected_at volta a null: aprovar alguém que tinha sido recusado antes
  // (via "Reconsiderar" ou direto) desfaz o estado de recusa.
  const { error } = await supabase
    .from('profiles')
    .update({ active: true, rejected_at: null })
    .eq('id', userId)
  if (error) return { error: error.message }

  await supabase.from('member_courses').delete().eq('member_id', userId)
  const { error: courseError } = await supabase
    .from('member_courses')
    .insert(courseIds.map((course_id) => ({ member_id: userId, course_id })))
  if (courseError) return { error: courseError.message }

  const [{ data: profile }, { data: userData }, settings] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    adminClient.auth.admin.getUserById(userId),
    getSettings(),
  ])
  const email = userData.user?.email ?? ''
  if (email) emailMemberApproved(email, profile?.full_name ?? '', settings.site_name)

  logActivity(authz, { action: 'toggle', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: 'aprovou' })

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function rejectMember(userId: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ rejected_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return { error: error.message }

  const [{ data: profile }, { data: userData }, settings] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
    adminClient.auth.admin.getUserById(userId),
    getSettings(),
  ])
  const email = userData.user?.email ?? ''
  if (email) emailMemberRejected(email, profile?.full_name ?? '', settings.site_name)

  logActivity(authz, { action: 'toggle', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: 'recusou' })

  revalidatePath('/admin/membros')
  return { success: true }
}

// Rede de segurança pra recusa por engano — volta pra "pendente".
export async function reconsiderMember(userId: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single()

  const { error } = await supabase
    .from('profiles')
    .update({ rejected_at: null })
    .eq('id', userId)
  if (error) return { error: error.message }

  logActivity(authz, { action: 'toggle', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: 'reconsiderou (voltou pra pendente)' })

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMemberRole(userId: string, role: 'admin' | 'member' | 'collaborator', collaboratorAreaId?: string | null) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  if (role === 'collaborator' && !collaboratorAreaId) {
    return { error: 'Escolha a área do colaborador.' }
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', userId).single()

  const { error } = await adminClient
    .from('profiles')
    .update({ role, collaborator_area_id: role === 'collaborator' ? collaboratorAreaId : null })
    .eq('id', userId)

  if (error) return { error: error.message }

  logActivity(authz, { action: 'update', entityType: 'membro', entityId: userId, entityLabel: profile?.full_name || userId, detail: `alterou papel para: ${role}` })

  revalidatePath('/admin/membros')
  return { success: true }
}
