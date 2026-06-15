'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitLead(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const email = (formData.get('email') as string | null)?.trim() ?? ''

  if (!name || !email) return { error: 'Preencha nome e e-mail.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'E-mail inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.from('landing_leads').insert({ name, email })

  if (error) {
    if (error.code === '23505') return { error: 'Este e-mail já está cadastrado.' }
    return { error: 'Não foi possível salvar. Tente novamente.' }
  }

  return { success: true }
}
