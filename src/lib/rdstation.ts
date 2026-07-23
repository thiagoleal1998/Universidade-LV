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
} as const

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

async function sendConversion(conversionIdentifier: string, email: string, extra: Record<string, string> = {}) {
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
        payload: { conversion_identifier: conversionIdentifier, email, ...extra },
      }),
    })
  } catch {
    console.error('[rdstation] falhou ao enviar evento:', conversionIdentifier)
  }
}

export async function rdWelcomeOnRegister(email: string, name: string) {
  await sendConversion(RD_EVENTS.cadastro, email, { name })
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

    await sendConversion(RD_EVENTS.perfil_atualizado, email, {
      name: profile?.full_name ?? '',
      cf_empresa_lv: profile?.company ?? '',
      cf_cargo_lv: profile?.job_title ?? '',
      cf_tags_lv: tags,
      cf_cursos: cursos,
    })
  } catch {
    console.error('[rdstation] falhou ao sincronizar perfil do lead:', userId)
  }
}
