// Rotina diária de saúde da plataforma — pensada para rodar via cron NA VPS
// (não é uma rotina agendada do Claude Code: essas expiram em 7 dias e não
// servem para monitoramento permanente). Sem Playwright de propósito: um
// cron de infra não deve carregar Chromium numa VPS de produção só para
// isso — login e RLS são testados direto pela API do Supabase, o mesmo
// mecanismo que a UI usa por baixo.
//
//   npm run health-check                       (roda tudo, sempre manda e-mail)
//   npm run health-check -- --dry-run           (roda tudo, só imprime o e-mail)
//
// Manda e-mail TODO dia via RD Station: resumo "tudo ok" se nada falhou,
// ou o alerta de sempre se algo falhou — assim dá pra distinguir "está tudo
// bem" de "o cron parou de rodar" (o segundo caso não manda e-mail nenhum).
// Sai com código 1 se qualquer verificação falhar (fica no log do cron).
//
// Precisa da flag --experimental-websocket em Node < 22 (por isso o script
// "health-check" do package.json já inclui): @supabase/supabase-js cria um
// RealtimeClient na hora do createClient(), mesmo sem usar realtime nenhuma
// vez — e esse construtor lança exceção síncrona se não achar um WebSocket
// nativo no ambiente. O app Next.js nunca esbarra nisso (o bundler injeta
// um polyfill), mas um script node puro sim. Confirmado: sem a flag, a VPS
// (Node 20) quebra em createClient() antes de qualquer verificação rodar.
import { createClient } from '@supabase/supabase-js'
import { Client as NotionClient } from '@notionhq/client'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const { requireEnv } = require('./_env.cjs')

const dryRun = process.argv.includes('--dry-run')
const SITE_URL = process.env.HEALTH_CHECK_SITE_URL || 'https://universidadelv.com.br'

const env = requireEnv([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RDSTATION_CLIENT_ID',
  'RDSTATION_CLIENT_SECRET',
  'ADMIN_EMAIL',
  'NOTION_API_KEY',
])

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── 1. Disponibilidade do site ──────────────────────────────────────────
async function checkAvailability() {
  const paths = ['/', '/login', '/sitemap.xml', '/robots.txt']
  const failures = []
  for (const p of paths) {
    try {
      const res = await fetch(`${SITE_URL}${p}`, { redirect: 'manual' })
      if (res.status !== 200) failures.push(`${p} → HTTP ${res.status}`)
    } catch (err) {
      failures.push(`${p} → ${err.message}`)
    }
  }
  return { name: 'Disponibilidade do site', ok: failures.length === 0, detail: failures.join('; ') }
}

// ── 2. Login + RLS pós-login, para os 3 papéis ──────────────────────────
// Conta descartável (mesmo padrão de scripts/e2e.mjs), criada e apagada a
// cada execução. Login de verdade (signInWithPassword com o client anon,
// como o navegador faz) + uma leitura protegida por RLS confirmando que o
// papel bate — cobre "login funciona" e "RLS não está quebrada" numa
// verificação só.
async function checkLoginAndRole(role) {
  const email = `healthcheck-${role}.${Date.now()}@example.com`
  const password = `Hc_${Math.random().toString(36).slice(2, 10)}!Aa1`
  let userId = null
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw new Error(`criar conta: ${error.message}`)
    userId = data.user.id

    const { error: pErr } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: `Health Check ${role}`, role, active: true })
      .eq('id', userId)
    if (pErr) throw new Error(`atualizar profile: ${pErr.message}`)

    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error: signInErr } = await anon.auth.signInWithPassword({ email, password })
    if (signInErr) throw new Error(`login: ${signInErr.message}`)

    const { data: profile, error: profErr } = await anon.from('profiles').select('role').eq('id', userId).single()
    if (profErr) throw new Error(`leitura pós-login (RLS): ${profErr.message}`)
    if (profile?.role !== role) throw new Error(`papel inesperado após login: ${profile?.role}`)

    return { name: `Login (${role})`, ok: true, detail: '' }
  } catch (err) {
    return { name: `Login (${role})`, ok: false, detail: err.message }
  } finally {
    if (userId) await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
  }
}

// ── 3. Fluxos críticos (leitura, sem mutação) ───────────────────────────
// De propósito só leitura: nada aqui pode criar chamado real (dispara
// Notion + notificação ao admin de verdade) nem comunicado real.
async function checkCoreDataReads() {
  try {
    const [{ error: coursesErr }, { error: feedbackErr }, { error: membersErr }] = await Promise.all([
      supabaseAdmin.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('feedback_reports').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('active', true),
    ])
    if (coursesErr) throw new Error(`cursos: ${coursesErr.message}`)
    if (feedbackErr) throw new Error(`feedback_reports: ${feedbackErr.message}`)
    if (membersErr) throw new Error(`profiles: ${membersErr.message}`)
    return { name: 'Leitura de dados críticos (cursos/feedback/membros)', ok: true, detail: '' }
  } catch (err) {
    return { name: 'Leitura de dados críticos (cursos/feedback/membros)', ok: false, detail: err.message }
  }
}

// ── 4. Integrações externas ──────────────────────────────────────────────
const RD_TOKEN_URL = 'https://api.rd.services/auth/token'
const RD_EVENTS_URL = 'https://api.rd.services/platform/events?event_type=conversion'

// Mesma lógica de scr/lib/rdstation.ts:getAccessToken, duplicada aqui de
// propósito — este script roda fora do Next (node puro), sem o alias "@/"
// nem o contexto de servidor, então importar o módulo original não é
// direto. Se um dia isso incomodar, extrair para um módulo .mjs comum.
async function getRdAccessToken() {
  const { data: row, error } = await supabaseAdmin.from('rdstation_tokens').select('*').eq('id', 1).single()
  if (error || !row) throw new Error('sem token salvo em rdstation_tokens')
  const expiresAt = new Date(row.expires_at).getTime()
  if (Date.now() < expiresAt - 5 * 60 * 1000) return row.access_token
  const res = await fetch(RD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.RDSTATION_CLIENT_ID, client_secret: env.RDSTATION_CLIENT_SECRET, refresh_token: row.refresh_token }),
  })
  if (!res.ok) throw new Error(`renovar token: HTTP ${res.status}`)
  const json = await res.json()
  await supabaseAdmin.from('rdstation_tokens').update({
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? row.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  return json.access_token
}

async function checkRdStationIntegration() {
  try {
    const token = await getRdAccessToken()
    if (!token) throw new Error('access_token vazio')
    return { name: 'Integração RD Station (OAuth)', ok: true, detail: '' }
  } catch (err) {
    return { name: 'Integração RD Station (OAuth)', ok: false, detail: err.message }
  }
}

async function checkNotionIntegration() {
  try {
    const notion = new NotionClient({ auth: env.NOTION_API_KEY })
    await notion.users.me({})
    return { name: 'Integração Notion', ok: true, detail: '' }
  } catch (err) {
    return { name: 'Integração Notion', ok: false, detail: err.message }
  }
}

// ── 5. Status externo dos provedores ────────────────────────────────────
async function checkRdStationStatusPage() {
  try {
    const res = await fetch('https://status.rdstation.com/api/v2/status.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const indicator = json?.status?.indicator ?? 'unknown'
    // "maintenance" é janela programada e anunciada, não uma falha — só
    // minor/major/critical (algo realmente degradado/fora do ar) alerta.
    const ok = indicator === 'none' || indicator === 'maintenance'
    return { name: 'Status RD Station', ok, detail: ok ? '' : `${indicator}: ${json?.status?.description ?? ''}` }
  } catch (err) {
    return { name: 'Status RD Station', ok: false, detail: err.message }
  }
}

// HostGator não expõe API tipo Statuspage (confirmado: /api/v2/status.json
// devolve 404) — página própria, sem formato documentado. Melhor esforço:
// extrai o texto do banner logo no topo do <body> (mesma convenção visual
// de "Todos os sistemas operacionais" / "Alguns sistemas apresentam
// falhas") e procura palavras que indicam problema. Frágil por natureza —
// se a HostGator redesenhar a página, isso para de funcionar sem avisar
// (o fetch continua OK, só o parsing fica obsoleto). Rever se começar a
// dar falso-negativo.
async function checkHostgatorStatusPage() {
  try {
    const res = await fetch('https://status.hostgator.com.br/')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const bodyMatch = html.match(/<body[\s\S]*?(?=<footer)/)
    const text = (bodyMatch ? bodyMatch[0] : html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const banner = text.slice(0, 300)
    const bad = /apresentam falhas|interromp|indispon[íi]vel|degradad|incidente ativo|fora do ar/i
    const isBad = bad.test(banner)
    return { name: 'Status HostGator', ok: !isBad, detail: isBad ? banner : '' }
  } catch (err) {
    return { name: 'Status HostGator', ok: false, detail: err.message }
  }
}

// ── Relatório via RD Station (sempre envia, falha ou não) ───────────────
// Antes só mandava e-mail em falha — o usuário relatou "não recebi nada
// hoje" num dia em que estava tudo ok e não tinha como saber se era "sem
// problema" ou "o cron nem rodou" (o próprio alerta silencioso não avisa
// de si mesmo quebrado). Agora manda um e-mail TODO dia: resumo "tudo ok"
// quando não há falha, e o mesmo alerta de sempre quando há.
// Destinatários fixos além do ADMIN_EMAIL — pedido do usuário (19/08/2026).
// Hardcoded aqui de propósito: é um script de infra que ninguém edita pela
// UI, não um `settings` da tabela.
const EXTRA_RECIPIENTS = ['jonas.almeida@litoralverde.com.br', 'gustavo.monken@litoralverde.com.br']

async function sendReport(results, failures) {
  const ok = failures.length === 0
  const title = ok
    ? '✓ Verificação diária: tudo certo'
    : `⚠ Verificação diária: ${failures.length} problema(s) encontrado(s)`
  // <br> em vez de \n: o RD Station insere cf_corpo dentro do HTML do
  // template do jeito que veio — uma quebra de linha "crua" (\n) é
  // whitespace comum pro HTML, que colapsa tudo numa linha só (foi
  // exatamente o sintoma relatado: os itens saíam um do lado do outro).
  const body = ok
    ? results.map((r) => `✓ ${r.name}`).join('<br>')
    : failures.map((f) => `• ${f.name}: ${f.detail || 'falhou, sem detalhe'}`).join('<br>')

  if (dryRun) {
    console.log(`\n[--dry-run] e-mail que seria enviado:\n${title}\n${body.replace(/<br>/g, '\n')}`)
    return
  }
  if (!env.ADMIN_EMAIL) {
    console.error('✗ ADMIN_EMAIL não configurado — não foi possível enviar o e-mail.')
    return
  }
  const recipients = [...new Set([env.ADMIN_EMAIL, ...EXTRA_RECIPIENTS])]
  try {
    const token = await getRdAccessToken()
    if (!token) throw new Error('sem access_token')
    for (const email of recipients) {
      await fetch(RD_EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          event_type: 'CONVERSION',
          event_family: 'CDP',
          payload: {
            conversion_identifier: 'universidade-lv-alerta-sistema',
            email,
            cf_tags_lv: 'Admin',
            cf_titulo: title,
            cf_corpo: body,
          },
        }),
      })
    }
    console.log(`✓ e-mail enviado via RD Station (${recipients.join(', ')})`)
  } catch (err) {
    // Se o próprio RD Station é o que está fora do ar, o e-mail não sai —
    // ponto único de falha aceito deliberadamente (decisão do usuário:
    // reaproveitar a infra existente em vez de um segundo canal). O log em
    // disco abaixo é a rede de segurança nesse cenário.
    console.error(`✗ falhou ao enviar e-mail via RD Station: ${err.message}`)
  }
}

// ── Execução ─────────────────────────────────────────────────────────────
const checks = [
  checkAvailability,
  () => checkLoginAndRole('member'),
  () => checkLoginAndRole('collaborator'),
  () => checkLoginAndRole('admin'),
  checkCoreDataReads,
  checkRdStationIntegration,
  checkNotionIntegration,
  checkRdStationStatusPage,
  checkHostgatorStatusPage,
]

const results = []
for (const check of checks) {
  results.push(await check())
}

const failures = results.filter((r) => !r.ok)
const startedAt = new Date().toISOString()

console.log(`\n=== Health check — ${startedAt} ===`)
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
}

const logDir = path.join(process.cwd(), 'logs')
fs.mkdirSync(logDir, { recursive: true })
const logLine = `${startedAt} | ${failures.length === 0 ? 'OK' : `${failures.length} FALHA(S): ${failures.map((f) => f.name).join(', ')}`}\n`
fs.appendFileSync(path.join(logDir, 'health-check.log'), logLine)

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} falha(s)`)
  process.exitCode = 1
} else {
  console.log('\n✓ tudo ok')
}

await sendReport(results, failures)
