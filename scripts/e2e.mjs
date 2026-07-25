// Teste E2E com conta descartável: cria o usuário, loga, navega, tira o
// screenshot e APAGA a conta — inclusive se o teste falhar no meio.
//
//   npm run e2e -- --role member --path /dashboard --shot sidebar.png
//   npm run e2e -- --role admin --path /admin/configuracoes --shot cfg.png
//   npm run e2e -- --role member --path /dashboard --shot logo.png --clip 0,0,240,120
//   npm run e2e -- --role admin --path /admin --keep    (não apaga a conta)
//
// Requer o servidor rodando (npm run build && npm run start).
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { requireEnv } = require('./_env.cjs')

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const role = arg('role', 'member')
const shot = arg('shot')
const clip = arg('clip')
const keep = flag('keep')
const baseUrl = arg('base', 'http://localhost:3000')
const waitMs = Number(arg('wait', 1500))

if (!['member', 'collaborator', 'admin'].includes(role)) {
  console.error(`✗ --role inválido: "${role}". Use member, collaborator ou admin.`)
  process.exit(1)
}

// O Git Bash (MSYS) reescreve argumentos que começam com "/" como caminho
// do Windows: --path /dashboard chega aqui como "C:/.../Git/dashboard".
// Aceitar a forma sem barra (--path dashboard) evita a armadilha de vez.
function normalizePath(raw) {
  if (!raw) return '/dashboard'
  let p = raw
  if (/^[A-Za-z]:[\\/]/.test(p)) {
    const tail = p.replace(/\\/g, '/').split('/Git/')[1]
    if (!tail) {
      console.error(`✗ --path "${raw}" foi convertido pelo shell e não deu para recuperar.`)
      console.error('  Passe sem a barra inicial: --path dashboard/cursos\n')
      process.exit(1)
    }
    console.warn(`⚠ --path foi reescrito pelo Git Bash; interpretando como "/${tail}"`)
    p = tail
  }
  return p.startsWith('/') ? p : `/${p}`
}
const path = normalizePath(arg('path'))

const env = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const email = `e2e-${role}.${Date.now()}@example.com`
const password = `E2e_${Math.random().toString(36).slice(2, 10)}!Aa1`

let userId = null
let browser = null
let failed = false

try {
  // ── Conta descartável ───────────────────────────────────────────────
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (error) throw new Error(`criar usuário: ${error.message}`)
  userId = data.user.id

  const { error: pErr } = await supabase.from('profiles')
    .update({ full_name: `E2E ${role}`, role, active: true })
    .eq('id', userId)
  if (pErr) throw new Error(`atualizar profile: ${pErr.message}`)
  console.log(`✓ conta criada: ${email} (${role})`)

  // ── Login + navegação ───────────────────────────────────────────────
  browser = await chromium.launch()
  // Altura ajustável porque o layout tem scroll interno: --full (fullPage do
  // Playwright) não alcança conteúdo abaixo da dobra nesse caso; aumentar a
  // viewport é o que funciona.
  const page = await browser.newPage({
    viewport: { width: Number(arg('width', 1280)), height: Number(arg('height', 900)) },
  })

  // Conta nova cai no modal de onboarding, que cobre a tela e intercepta
  // cliques. Marcar como visto antes de carregar é confiável; clicar em
  // "Pular" depois do login corre contra a montagem do modal e falha às vezes.
  await page.addInitScript(() => localStorage.setItem('onboarding_complete_v1', '1'))

  await page.goto(`${baseUrl}/login`)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard|admin/, { timeout: 30000 })
  console.log('✓ login ok')

  if (path !== '/dashboard') {
    await page.goto(`${baseUrl}${path}`)
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(waitMs)
  console.log(`✓ em ${page.url()}`)

  if (shot) {
    const opts = { path: shot }
    if (clip) {
      const [x, y, width, height] = clip.split(',').map(Number)
      opts.clip = { x, y, width, height }
    } else if (flag('full')) {
      opts.fullPage = true
    }
    await page.screenshot(opts)
    console.log(`✓ screenshot: ${shot}`)
  }
} catch (err) {
  failed = true
  console.error(`\n✗ ${err.message}`)
} finally {
  // Cleanup roda mesmo em caso de erro — é o que evita conta órfã no banco.
  if (browser) await browser.close().catch(() => {})
  if (userId && !keep) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    console.log(error ? `✗ falha ao apagar conta: ${error.message}` : '✓ conta de teste removida')
  } else if (userId && keep) {
    console.log(`⚠ conta MANTIDA (--keep): ${email} / ${password}`)
  }
  process.exit(failed ? 1 : 0)
}
