'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { emailAdminNewMemberPending } from '@/lib/email'

export async function login(_state: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou senha incorretos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Erro ao autenticar.' }

  // Usa adminClient para leitura do perfil pós-login — RLS não deve bloquear operação server-side de autenticação
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single()

  if (!profile?.active) {
    await supabase.auth.signOut()
    return { error: 'Sua conta está desativada. Entre em contato com o administrador.' }
  }

  return { redirectTo: profile.role === 'admin' ? '/admin' : '/dashboard' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(_state: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: 'Não foi possível enviar o email. Verifique o endereço informado.' }
  return { success: true }
}

export async function resetPassword(_state: unknown, formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'Não foi possível redefinir a senha. O link pode ter expirado.' }

  redirect('/login?reset=1')
}

export async function register(_state: unknown, formData: FormData) {
  const full_name = (formData.get('full_name') as string).trim()
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
      return { error: 'Este email já está cadastrado.' }
    }
    return { error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  // Deixa conta inativa até o admin aprovar
  if (data.user) {
    await adminClient.from('profiles').update({ active: false, full_name }).eq('id', data.user.id)
    emailAdminNewMemberPending(full_name, email)
  }

  return { success: true }
}
