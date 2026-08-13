import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'

const clientId = process.env.RDSTATION_CLIENT_ID
const clientSecret = process.env.RDSTATION_CLIENT_SECRET
const TOKEN_URL = 'https://api.rd.services/auth/token'
const EVENTS_URL = 'https://api.rd.services/platform/events?event_type=conversion'

const RD_EVENTS = {
  cadastro: 'universidade-lv-cadastro',
  aprovado: 'universidade-lv-aprovado',
  recusado: 'universidade-lv-recusado',
  comunicado: 'universidade-lv-comunicado',
  conteudo_publicado: 'universidade-lv-conteudo-publicado',
  treinamento_novo: 'universidade-lv-treinamento-novo',
  perfil_atualizado: 'universidade-lv-perfil-atualizado',
  admin_cadastro_pendente: 'universidade-lv-admin-cadastro-pendente',
  admin_feedback_novo: 'universidade-lv-admin-feedback-novo',
  tarefa_corrigida: 'universidade-lv-tarefa-corrigida',
  chamado_aberto: 'universidade-lv-chamado-aberto',
  chamado_andamento: 'universidade-lv-chamado-andamento',
  chamado_resolvido: 'universidade-lv-chamado-resolvido',
  redefinicao_senha: 'universidade-lv-redefinicao-senha',
  consentimento_inicial: 'universidade-lv-consentimento-inicial',
  treinamento_acesso_solicitado: 'universidade-lv-treinamento-acesso-solicitado',
  famtour_acesso_solicitado: 'universidade-lv-famtour-acesso-solicitado',
} as const

// Destinatário dos 2 eventos admin-only abaixo — não é um membro, é o
// e-mail do próprio admin (mesma variável já usada pelo Resend antes).
const adminEmail = process.env.ADMIN_EMAIL ?? ''

// Busca (e renova se preciso) o access_token guardado em rdstation_tokens.
// Nunca lido/escrito via client de sessão — só adminClient (tabela sem
// nenhuma policy de leitura pública, diferente de site_settings).
async function getAccessToken(): Promise<string | null> {
  if (!clientId || !clientSecret) return null

  const adminClient = createAdminClient()
  const { data: row } = await adminClient.from('rdstation_tokens').select('*').eq('id', 1).single()
  if (!row) return null // ainda não autorizado (fluxo OAuth de uma vez feito manualmente)

  const expiresAt = new Date(row.expires_at).getTime()
  if (Date.now() < expiresAt - 5 * 60 * 1000) return row.access_token

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, refresh_token: row.refresh_token }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString()
    await adminClient
      .from('rdstation_tokens')
      .update({
        access_token: json.access_token,
        refresh_token: json.refresh_token ?? row.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    return json.access_token
  } catch {
    console.error('[rdstation] falhou ao renovar access_token')
    return null
  }
}

type LegalBasis = { category: string; type: string; status: string }

// Consentimento de comunicação (LGPD) — enviado junto do cadastro pra que
// automações de e-mail que a RD Station trata como "marketing" (ex.: o
// comunicado geral) não fiquem bloqueadas por falta de base legal. Descoberto
// investigando um fluxo cujo bloco "Enviar Email" ficava em 0 entregues mesmo
// disparando corretamente, enquanto e-mails transacionais (redefinir senha,
// aprovação, etc.) sempre funcionaram sem isso.
const MARKETING_CONSENT: LegalBasis[] = [{ category: 'communications', type: 'consent', status: 'granted' }]

async function sendConversion(conversionIdentifier: string, email: string, extra: Record<string, string> = {}, legalBases?: LegalBasis[]) {
  if (!email) return
  try {
    const token = await getAccessToken()
    if (!token) return
    await fetch(EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        event_type: 'CONVERSION',
        event_family: 'CDP',
        payload: {
          conversion_identifier: conversionIdentifier,
          email,
          ...extra,
          ...(legalBases ? { legal_bases: legalBases } : {}),
        },
      }),
    })
  } catch {
    console.error('[rdstation] falhou ao enviar evento:', conversionIdentifier)
  }
}

export async function rdWelcomeOnRegister(email: string, name: string) {
  await sendConversion(RD_EVENTS.cadastro, email, { name }, MARKETING_CONSENT)
}

// Concede consentimento sem disparar nenhum e-mail — identificador dedicado,
// sem Automação vinculada a ele, só serve pra carregar o legal_bases. Usado
// nos caminhos de criação de conta que não passam por rdWelcomeOnRegister
// (ex.: admin criando membro direto, sem o fluxo de cadastro auto-serviço).
export async function rdGrantMarketingConsent(email: string) {
  await sendConversion(RD_EVENTS.consentimento_inicial, email, {}, MARKETING_CONSENT)
}

export async function rdMemberApproved(email: string, name: string) {
  await sendConversion(RD_EVENTS.aprovado, email, { name })
}

export async function rdMemberRejected(email: string, name: string) {
  await sendConversion(RD_EVENTS.recusado, email, { name })
}

export async function rdMembersNewAnnouncement(emails: string[], title: string, body: string) {
  for (const email of emails) {
    await sendConversion(RD_EVENTS.comunicado, email, { cf_titulo: title, cf_corpo: body })
  }
}

export async function rdCourseContentPublished(emails: string[], title: string, body: string, link: string) {
  for (const email of emails) {
    await sendConversion(RD_EVENTS.conteudo_publicado, email, { cf_titulo: title, cf_corpo: body, cf_link: link })
  }
}

export async function rdNewTraining(emails: string[], title: string, body: string, link: string) {
  for (const email of emails) {
    await sendConversion(RD_EVENTS.treinamento_novo, email, { cf_titulo: title, cf_corpo: body, cf_link: link })
  }
}

// Os 2 avisos internos ao admin (antes via Resend, agora aqui também) —
// o "lead" desse evento é o próprio admin, marcado com cf_tags_lv: "Admin"
// pra dar pra filtrar/segmentar fora dos leads reais nos relatórios da RD
// Station (mesmo campo já usado pra tags de membro, reaproveitado aqui).
export async function rdAdminNewMemberPending(memberName: string, memberEmail: string) {
  if (!adminEmail) return
  await sendConversion(RD_EVENTS.admin_cadastro_pendente, adminEmail, {
    cf_tags_lv: 'Admin',
    cf_titulo: memberName || memberEmail,
    cf_corpo: memberEmail,
  })
}

export async function rdAdminNewFeedback(memberName: string, memberEmail: string, type: string, title: string, excerpt: string) {
  if (!adminEmail) return
  const typeLabel = type === 'bug' ? 'Bug reportado' : 'Sugestão enviada'
  await sendConversion(RD_EVENTS.admin_feedback_novo, adminEmail, {
    cf_tags_lv: 'Admin',
    cf_titulo: `${typeLabel}: ${title || memberName || memberEmail}`,
    cf_corpo: `${memberName} (${memberEmail}): ${excerpt}`,
  })
}

export async function rdTaskGraded(email: string, name: string, taskTitle: string, grade: number, link: string) {
  await sendConversion(RD_EVENTS.tarefa_corrigida, email, {
    name,
    cf_titulo: taskTitle,
    cf_corpo: `Sua tarefa "${taskTitle}" foi corrigida e recebeu nota ${grade}/10.`,
    cf_link: link,
  })
}

export async function rdFeedbackOpened(email: string, name: string, title: string, link: string) {
  await sendConversion(RD_EVENTS.chamado_aberto, email, {
    name,
    cf_titulo: title,
    cf_corpo: `Recebemos seu chamado "${title}". Nossa equipe vai analisar e te avisamos por aqui.`,
    cf_link: link,
  })
}

export async function rdFeedbackInProgress(email: string, name: string, title: string, link: string) {
  await sendConversion(RD_EVENTS.chamado_andamento, email, {
    name,
    cf_titulo: title,
    cf_corpo: `Seu chamado "${title}" está em andamento — nossa equipe já começou a analisar.`,
    cf_link: link,
  })
}

export async function rdFeedbackResolved(email: string, name: string, title: string, link: string) {
  await sendConversion(RD_EVENTS.chamado_resolvido, email, {
    name,
    cf_titulo: title,
    cf_corpo: `Seu chamado "${title}" foi finalizado.`,
    cf_link: link,
  })
}

// Um e-mail por destinatário (mesmo padrão de rdMembersNewAnnouncement/
// rdNewTraining) — os destinatários são sempre admins + colaboradores da
// área "Promotor Interno" (ver notifyTrainingAccessReviewers), nunca um
// único e-mail fixo.
export async function rdTrainingAccessRequested(emails: string[], requesterName: string, trainingTitle: string, link: string) {
  for (const email of emails) {
    await sendConversion(RD_EVENTS.treinamento_acesso_solicitado, email, {
      cf_titulo: `${requesterName} solicitou acesso a um treinamento exclusivo`,
      cf_corpo: `"${trainingTitle}" — acesse o painel de Treinamentos pra aprovar ou negar.`,
      cf_link: link,
    })
  }
}

// Evento PRÓPRIO, não reaproveita rdTrainingAccessRequested — texto muda
// ("famtour" em vez de "treinamento") e precisa de Automação dedicada na
// RD Station de qualquer forma (mesmo padrão de manter 1 evento por cenário
// de negócio já usado pros 3 eventos de chamado de feedback).
export async function rdFamtourAccessRequested(emails: string[], requesterName: string, famtourTitle: string, link: string) {
  for (const email of emails) {
    await sendConversion(RD_EVENTS.famtour_acesso_solicitado, email, {
      cf_titulo: `${requesterName} solicitou acesso a um famtour exclusivo`,
      cf_corpo: `"${famtourTitle}" — acesse o painel de Famtours pra aprovar ou negar.`,
      cf_link: link,
    })
  }
}

// Link de recuperação gerado via adminClient.auth.admin.generateLink (não
// envia e-mail nenhum sozinho, só devolve o link) — substitui o e-mail nativo
// do Supabase (auth.resetPasswordForEmail), que ia direto pelo SMTP deles.
export async function rdPasswordReset(email: string, name: string, link: string) {
  await sendConversion(RD_EVENTS.redefinicao_senha, email, {
    name,
    cf_titulo: 'Redefinição de senha',
    cf_corpo: 'Recebemos um pedido para redefinir a senha da sua conta na Universidade LV. Se foi você, clique no link abaixo para criar uma nova senha.',
    cf_link: link,
  })
}

// Busca e-mail + nome de um membro pra alimentar os eventos de e-mail acima —
// os call sites (gradeTaskResponse, updateFeedbackStatus) só têm o userId.
export async function getMemberEmailAndName(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const adminClient = createAdminClient()
    const [{ data: userData }, { data: profile }] = await Promise.all([
      adminClient.auth.admin.getUserById(userId),
      adminClient.from('profiles').select('full_name').eq('id', userId).single(),
    ])
    const email = userData.user?.email
    if (!email) return null
    return { email, name: profile?.full_name ?? '' }
  } catch {
    return null
  }
}

// Mantém cursos/tags/empresa/cargo do lead sempre atualizados na RD Station
// (pra segmentação de marketing) — sem Automação de e-mail associada a este
// identificador, é só atualização de campos do Lead.
export async function syncLeadProfile(userId: string) {
  try {
    const adminClient = createAdminClient()
    const [{ data: profile }, { data: userData }, { data: tagRows }, { data: courseRows }] = await Promise.all([
      adminClient.from('profiles').select('full_name, company, job_title').eq('id', userId).single(),
      adminClient.auth.admin.getUserById(userId),
      adminClient.from('profile_tags').select('tags(name)').eq('profile_id', userId),
      adminClient.from('member_courses').select('courses(name)').eq('member_id', userId),
    ])

    const email = userData.user?.email
    if (!email) return

    const tags = (tagRows ?? [])
      .map((r: { tags: unknown }) => toOne<{ name: string }>(r.tags as never)?.name)
      .filter(Boolean)
      .join(', ')
    const cursos = (courseRows ?? [])
      .map((r: { courses: unknown }) => toOne<{ name: string }>(r.courses as never)?.name)
      .filter(Boolean)
      .join(', ')

    // legalBases aqui de propósito: syncLeadProfile roda sempre que um admin
    // edita um membro, inclusive quando o e-mail muda — sem isso, o e-mail
    // NOVO nunca teria consentimento registrado (a RD Station trata como um
    // lead novo), mesmo o antigo já tendo.
    await sendConversion(RD_EVENTS.perfil_atualizado, email, {
      name: profile?.full_name ?? '',
      cf_empresa_lv: profile?.company ?? '',
      cf_cargo_lv: profile?.job_title ?? '',
      cf_tags_lv: tags,
      cf_cursos: cursos,
    }, MARKETING_CONSENT)
  } catch {
    console.error('[rdstation] falhou ao sincronizar perfil do lead:', userId)
  }
}
