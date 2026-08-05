// Verificação server-side do Cloudflare Turnstile — cada action chama isso
// antes de processar o formulário de verdade.

const secretKey = process.env.TURNSTILE_SECRET_KEY

// Sem TURNSTILE_SECRET_KEY configurada (dev local sem .env), não bloqueia —
// mesma filosofia de "sem client_id/secret, o evento vira no-op" já usado
// pra RD Station, pra não travar quem está rodando localmente sem as chaves.
export async function verifyTurnstile(token: string | null, expectedAction: string): Promise<boolean> {
  if (!secretKey) return true
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })
    if (!res.ok) return false
    const data = await res.json()
    // `action` só vem no retorno quando foi enviado na criação do widget —
    // sempre é o caso aqui, mas o `!data.action` é uma defesa extra.
    return !!data.success && (!data.action || data.action === expectedAction)
  } catch {
    return false
  }
}
