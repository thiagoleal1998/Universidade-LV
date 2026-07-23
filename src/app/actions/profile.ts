'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { syncLeadProfile } from '@/lib/rdstation'

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  const path = `avatars/${user.id}/avatar.webp`

  const adminClient = createAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from('lesson-photos')
    .upload(path, webpFile, { upsert: true, contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data } = adminClient.storage.from('lesson-photos').getPublicUrl(path)

  const { error: dbError } = await adminClient
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', user.id)

  if (dbError) return { error: `Erro ao salvar: ${dbError.message}` }

  revalidatePath('/', 'layout')
  return { success: true, url: data.publicUrl }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const full_name = formData.get('full_name') as string
  const company = ((formData.get('company') as string) ?? '').trim()
  const job_title = ((formData.get('job_title') as string) ?? '').trim()
  const linkedin_url = ((formData.get('linkedin_url') as string) ?? '').trim()
  const bio = (formData.get('bio') as string) ?? ''

  if (linkedin_url) {
    try { new URL(linkedin_url) } catch { return { error: 'Link do LinkedIn inválido. Cole uma URL completa (https://...).' } }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ full_name, company, job_title, linkedin_url, bio })
    .eq('id', user.id)

  if (error) return { error: error.message }

  syncLeadProfile(user.id)
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) return { error: 'As senhas não coincidem.' }
  if (password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { success: true }
}
