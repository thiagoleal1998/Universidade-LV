import { Resend } from 'resend'

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

export async function emailAdminNewMemberPending(memberName: string, memberEmail: string) {
  if (!adminEmail) return
  await send(
    adminEmail,
    'Novo cadastro pendente de aprovação',
    `<p>O membro <strong>${memberName || memberEmail}</strong> acabou de se cadastrar e está aguardando aprovação.</p>
     <p>Acesse o painel administrativo para aprovar ou recusar o acesso.</p>`
  )
}

export async function emailMemberApproved(memberEmail: string, memberName: string, siteName: string) {
  await send(
    memberEmail,
    `Seu acesso foi aprovado — ${siteName}`,
    `<p>Olá, ${memberName || 'membro'}!</p>
     <p>Seu cadastro foi aprovado. Agora você já pode fazer login e acessar o conteúdo da plataforma.</p>`
  )
}

export async function emailMembersNewAnnouncement(
  emails: string[],
  title: string,
  body: string,
  siteName: string
) {
  if (emails.length === 0) return
  await send(
    emails,
    `[${siteName}] ${title}`,
    `<p><strong>${title}</strong></p><p>${body.replace(/\n/g, '<br/>')}</p>`
  )
}
