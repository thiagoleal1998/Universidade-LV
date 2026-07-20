'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'

export type EmailTemplate = {
  type: string
  subject: string
  body_html: string
  updated_at: string
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('email_templates').select('*').order('type')
  return (data ?? []) as EmailTemplate[]
}

export async function updateEmailTemplate(type: string, subject: string, bodyHtml: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const trimmedSubject = subject.trim()
  if (!trimmedSubject) return { error: 'O assunto não pode ficar vazio.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('email_templates')
    .update({ subject: trimmedSubject, body_html: bodyHtml, updated_at: new Date().toISOString() })
    .eq('type', type)
  if (error) return { error: error.message }

  logActivity(authz, { action: 'update', entityType: 'template_email', entityId: type, entityLabel: type, detail: 'alterou: assunto, corpo' })

  revalidatePath('/admin/configuracoes')
  return { success: true }
}
