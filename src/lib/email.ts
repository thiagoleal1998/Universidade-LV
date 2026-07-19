import { Resend } from 'resend'

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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function emailAdminNewFeedback(memberName: string, memberEmail: string, type: string, title: string, excerpt: string) {
  if (!adminEmail) return
  const typeLabel = type === 'bug' ? 'Bug reportado' : 'Sugestão enviada'
  await send(
    adminEmail,
    `[Feedback] ${typeLabel} — ${title || memberName || memberEmail}`,
    `<p><strong>${escapeHtml(memberName || memberEmail)}</strong> (${escapeHtml(memberEmail)}) abriu um chamado (${typeLabel}):</p>
     <p><strong>${escapeHtml(title)}</strong></p>
     <p>${escapeHtml(excerpt)}</p>
     <p>Acesse o painel administrativo (Feedback) para ver os detalhes e responder.</p>`
  )
}

export async function emailWelcomeOnRegister(memberEmail: string, memberName: string, siteName: string) {
  await send(
    memberEmail,
    `Recebemos seu cadastro — ${siteName}`,
    `<p>Olá, ${memberName || 'tudo bem'}!</p>
     <p>Recebemos seu cadastro na <strong>${siteName}</strong> e ele já está em análise pela nossa equipe.</p>
     <p>Assim que for aprovado, você recebe um novo e-mail liberando o acesso.</p>`
  )
}

export async function emailCourseContentPublished(emails: string[], title: string, body: string, link: string, siteName: string) {
  if (emails.length === 0) return
  await send(
    emails,
    `[${siteName}] ${title}`,
    `<p><strong>${title}</strong></p><p>${body.replace(/\n/g, '<br/>')}</p>
     <p><a href="${siteUrl}${link}">Acessar na plataforma</a></p>`
  )
}

export async function emailNewTraining(emails: string[], title: string, body: string, link: string, siteName: string) {
  if (emails.length === 0) return
  await send(
    emails,
    `[${siteName}] ${title}`,
    `<p><strong>${title}</strong></p><p>${body.replace(/\n/g, '<br/>')}</p>
     <p><a href="${siteUrl}${link}">Acessar na plataforma</a></p>`
  )
}
