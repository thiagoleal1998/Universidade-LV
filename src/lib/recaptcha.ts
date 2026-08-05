// Verificação server-side do reCAPTCHA v3 (score, não quebra-cabeça) — cada
// action chama isso antes de processar o formulário de verdade.

const secretKey = process.env.RECAPTCHA_SECRET_KEY
const MIN_SCORE = 0.5

// Sem RECAPTCHA_SECRET_KEY configurada (dev local sem .env), não bloqueia —
// mesma filosofia de "sem client_id/secret, o evento vira no-op" já usado
// pra RD Station, pra não travar quem está rodando localmente sem as chaves.
export async function verifyRecaptcha(token: string | null, expectedAction: string): Promise<boolean> {
  if (!secretKey) return true
  if (!token) return false

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    })
    if (!res.ok) return false
    const data = await res.json()
    return !!data.success && data.action === expectedAction && (data.score ?? 0) >= MIN_SCORE
  } catch {
    return false
  }
}
