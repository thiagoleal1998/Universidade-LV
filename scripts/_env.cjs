// Leitura do .env.local para os scripts de manutenção (deploy, e2e).
// Não usa dotenv de propósito: é a única dependência que faltaria em uma
// máquina recém-clonada, e o parsing que precisamos aqui é trivial.
const fs = require('fs')
const path = require('path')

const ENV_PATH = path.join(__dirname, '..', '.env.local')

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error(`\n✗ .env.local não encontrado em ${ENV_PATH}`)
    console.error('  Copie o .env.example e preencha os valores reais.\n')
    process.exit(1)
  }

  const env = {}
  for (const rawLine of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // Remove aspas em volta do valor, se houver
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

// Exige as variáveis listadas; erra com mensagem clara em vez de deixar o
// script quebrar mais adiante com "undefined".
function requireEnv(keys) {
  const env = loadEnv()
  const missing = keys.filter((k) => !env[k])
  if (missing.length > 0) {
    console.error(`\n✗ Faltando no .env.local: ${missing.join(', ')}`)
    console.error('  Veja .env.example para a descrição de cada uma.\n')
    process.exit(1)
  }
  return env
}

module.exports = { loadEnv, requireEnv, ENV_PATH }
