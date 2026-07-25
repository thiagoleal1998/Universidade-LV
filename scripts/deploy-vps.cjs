// Deploy na VPS: git pull + npm install + build + pm2 restart.
//   npm run deploy
//   npm run deploy -- --verbose   (mostra a saída bruta completa)
//
// A saída é filtrada no caminho feliz (o build cospe ~150 linhas de warnings
// de engine e a lista inteira de rotas). Se algo falhar, imprime tudo.
const { requireEnv } = require('./_env.cjs')

// ssh2 não é dependência do projeto (só estes scripts usam). Resolvido do
// global para não pesar o node_modules da aplicação.
let Client
try {
  Client = require('ssh2').Client
} catch {
  try {
    const { execSync } = require('child_process')
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    Client = require(`${globalRoot}/ssh2`).Client
  } catch {
    console.error('\n✗ Pacote `ssh2` não encontrado (nem local, nem global).')
    console.error('  Instale com:  npm install -g ssh2\n')
    process.exit(1)
  }
}

const verbose = process.argv.includes('--verbose')
const env = requireEnv(['VPS_HOST', 'VPS_USER', 'VPS_PASSWORD'])
const port = Number(env.VPS_PORT || 22)
const appDir = env.VPS_APP_DIR || '/root/Universidade-LV'
const pmName = env.VPS_PM2_NAME || 'universidade-lv'

const CMD = [
  `cd ${appDir}`,
  'git pull origin main',
  'npm install',
  'npm run build',
  `pm2 restart ${pmName}`,
].join(' && ')

// Linhas que importam no caminho feliz. Todo o resto (warnings EBADENGINE,
// lista de 60 rotas, tabela de métricas do PM2) é ruído.
const KEEP = [
  /^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}/,
  /^Already up to date/,
  /files? changed/,
  /✓ Compiled/,
  /Finished TypeScript/,
  /^Failed to compile/,
  /^Type error/,
  /^Error:/,
  /^error /i,
  /\[PM2\].*(restart|✓|Error)/,
  /npm error/,
]

function summarize(raw) {
  return raw
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => KEEP.some((re) => re.test(l)))
}

const conn = new Client()
let out = ''

conn
  .on('ready', () => {
    console.log(`→ ${env.VPS_USER}@${env.VPS_HOST}:${port} — ${appDir}`)
    conn.exec(CMD, (err, stream) => {
      if (err) {
        console.error('✗ Falha ao abrir o canal SSH:', err.message)
        conn.end()
        process.exitCode = 1
        return
      }
      stream
        .on('close', (code) => {
          conn.end()
          const ok = code === 0
          if (verbose || !ok) {
            console.log(out)
          } else {
            const lines = summarize(out)
            console.log(lines.length ? lines.join('\n') : '(build sem novidades)')
          }
          console.log(ok ? '\n✓ Deploy concluído.' : `\n✗ Deploy falhou (exit ${code}).`)
          process.exitCode = ok ? 0 : 1
        })
        .on('data', (d) => { out += d.toString() })
        .stderr.on('data', (d) => { out += d.toString() })
    })
  })
  .on('error', (err) => {
    console.error(`\n✗ Não foi possível conectar em ${env.VPS_HOST}:${port} — ${err.message}`)
    console.error('  Confira VPS_HOST / VPS_PORT / VPS_USER / VPS_PASSWORD no .env.local.\n')
    process.exitCode = 1
  })
  .connect({
    host: env.VPS_HOST,
    port,
    username: env.VPS_USER,
    password: env.VPS_PASSWORD,
    readyTimeout: 30000,
  })
