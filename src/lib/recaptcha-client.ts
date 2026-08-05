'use client'

// Helper client-side do reCAPTCHA v3 — carrega o script sob demanda (só na
// primeira chamada, compartilhado entre todos os formulários) e devolve um
// token novo por submissão, vinculado à `action` (login/register/etc.), que o
// servidor confere bate com o esperado.

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(siteKey: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar reCAPTCHA'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Devolve null se a chave não estiver configurada (dev local sem .env) ou se
// o carregamento/execução falhar — os call sites tratam null como "segue sem
// captcha", e o servidor decide se bloqueia (também sem a secret key, não bloqueia).
export async function getRecaptchaToken(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  if (!siteKey || typeof window === 'undefined') return null
  try {
    await loadScript(siteKey)
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(siteKey, { action }).then(resolve).catch(reject)
      })
    })
  } catch {
    return null
  }
}
