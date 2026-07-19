import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const apiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? 'onboarding@resend.dev'
const adminEmail = process.env.ADMIN_EMAIL ?? ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'

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

export async function emailMemberApproved(memberEmail: string, memberName: string, siteName: string) {
  await sendTemplate('member_approved', memberEmail, {
    nome: memberName || 'membro',
    site_name: siteName,
  })
}

export async function emailMembersNewAnnouncement(
  emails: string[],
  title: string,
  body: string,
  siteName: string
) {
  if (emails.length === 0) return
  await sendTemplate('new_announcement', emails, {
    titulo: title,
    corpo: body.replace(/\n/g, '<br/>'),
    site_name: siteName,
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

export async function emailWelcomeOnRegister(memberEmail: string, memberName: string, siteName: string) {
  await sendTemplate('welcome_on_register', memberEmail, {
    nome: memberName || 'tudo bem',
    site_name: siteName,
  })
}

export async function emailCourseContentPublished(emails: string[], title: string, body: string, link: string, siteName: string) {
  if (emails.length === 0) return
  await sendTemplate('course_content_published', emails, {
    titulo: title,
    corpo: body.replace(/\n/g, '<br/>'),
    link: `${siteUrl}${link}`,
    site_name: siteName,
  })
}

export async function emailNewTraining(emails: string[], title: string, body: string, link: string, siteName: string) {
  if (emails.length === 0) return
  await sendTemplate('new_training', emails, {
    titulo: title,
    corpo: body.replace(/\n/g, '<br/>'),
    link: `${siteUrl}${link}`,
    site_name: siteName,
  })
}
