'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailMemberApproved } from '@/lib/email'
import { getSettings } from '@/lib/settings'

export async function createMember(formData: FormData) {
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

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMember(
  userId: string,
  data: {
    full_name: string
    email: string
    role: 'admin' | 'member'
    active: boolean
    new_password?: string
  }
) {
  const adminClient = createAdminClient()
  const supabase = await createClient()

  // Atualiza email e senha no auth (via admin API)
  const authUpdate: { email?: string; password?: string } = {}
  if (data.email) authUpdate.email = data.email
  if (data.new_password) authUpdate.password = data.new_password

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
    if (error) return { error: error.message }
  }

  // Atualiza nome, role e status no perfil
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: data.full_name, role: data.role, active: data.active })
    .eq('id', userId)

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function deleteMember(userId: string) {
  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function toggleMemberActive(userId: string, active: boolean) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ active })
    .eq('id', userId)

  if (error) return { error: error.message }

  // Envia email de boas-vindas quando aprovado
  if (active) {
    const [{ data: profile }, { data: userData }, settings] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
      adminClient.auth.admin.getUserById(userId),
      getSettings(),
    ])
    const email = userData.user?.email ?? ''
    if (email) emailMemberApproved(email, profile?.full_name ?? '', settings.site_name)
  }

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMemberNotes(userId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ admin_notes: notes || null })
    .eq('id', userId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function assignMemberCourses(memberId: string, courseIds: string[]) {
  const supabase = await createClient()
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
  revalidatePath('/admin/membros')
  return { success: true }
}

export async function approveMember(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) return { error: 'Selecione pelo menos um curso' }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ active: true })
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

  revalidatePath('/admin/membros')
  return { success: true }
}

export async function updateMemberRole(userId: string, role: 'admin' | 'member') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/membros')
  return { success: true }
}
