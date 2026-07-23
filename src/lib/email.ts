import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const apiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? 'onboarding@resend.dev'
const adminEmail = process.env.ADMIN_EMAIL ?? ''

const resend = apiKey ? new Resend(apiKey) : null

async function send(to: string | string[], subject: string, html: string) {
  if (!resend || !to || (Array.isArray(to) && to.length === 0)) return
  try {
    await resend.emails.send({ from: fromEmail, to, subject, html })
  } catch {
    // Email is non-critical — log and continue
    console.error('[email] failed to send:', subject)
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Textos editáveis pelo admin em Configurações → aba "E-mails" (tabela email_templates).
// Só os 2 tipos abaixo (admin_new_member_pending/admin_new_feedback) ainda usam isto —
// os demais e-mails de aluno migraram pra RD Station (src/lib/rdstation.ts, v1.86.0).
async function getTemplate(type: string): Promise<{ subject: string; body_html: string } | null> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('email_templates')
    .select('subject, body_html')
    .eq('type', type)
    .single()
  return data
}

function renderTemplate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

async function sendTemplate(type: string, to: string | string[], vars: Record<string, string>) {
  const tpl = await getTemplate(type)
  if (!tpl) return
  await send(to, renderTemplate(tpl.subject, vars), renderTemplate(tpl.body_html, vars))
}

export async function emailAdminNewMemberPending(memberName: string, memberEmail: string) {
  if (!adminEmail) return
  await sendTemplate('admin_new_member_pending', adminEmail, {
    nome: memberName || memberEmail,
  })
}

export async function emailAdminNewFeedback(memberName: string, memberEmail: string, type: string, title: string, excerpt: string) {
  if (!adminEmail) return
  const typeLabel = type === 'bug' ? 'Bug reportado' : 'Sugestão enviada'
  await sendTemplate('admin_new_feedback', adminEmail, {
    nome: escapeHtml(memberName || memberEmail),
    email: escapeHtml(memberEmail),
    tipo: typeLabel,
    titulo: escapeHtml(title || memberName || memberEmail),
    resumo: escapeHtml(excerpt),
  })
}
