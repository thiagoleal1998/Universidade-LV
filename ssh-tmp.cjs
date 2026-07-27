const { requireEnv } = require('./scripts/_env.cjs')
let Client
try { Client = require('ssh2').Client } catch {
  const { execSync } = require('child_process')
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
  Client = require(`${globalRoot}/ssh2`).Client
}
const env = requireEnv(['VPS_HOST', 'VPS_USER', 'VPS_PASSWORD'])
const port = Number(env.VPS_PORT || 22)
const cmd = process.argv.slice(2).join(' ')
const conn = new Client()
let out = ''
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err.message); conn.end(); process.exitCode = 1; return }
    stream.on('close', (code) => { conn.end(); console.log(out); if (code !== 0) process.exitCode = code })
      .on('data', d => out += d.toString()).stderr.on('data', d => out += d.toString())
  })
}).on('error', e => { console.error('conn error', e.message); process.exitCode = 1 })
  .connect({ host: env.VPS_HOST, port, username: env.VPS_USER, password: env.VPS_PASSWORD, readyTimeout: 30000 })
