'use client'

// Helper client-side do Cloudflare Turnstile (modo invisible) — carrega o
// script sob demanda (só na primeira chamada, compartilhado entre todos os
// formulários) e devolve um token novo por submissão, vinculado à `action`
// (login/register/etc.), que o servidor confere bate com o esperado.

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string
        action: string
        size?: 'invisible' | 'normal' | 'compact'
        callback: (token: string) => void
        'error-callback'?: () => void
      }) => string
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar Turnstile'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Devolve null se a chave não estiver configurada (dev local sem .env) ou se
// o carregamento/execução falhar — os call sites tratam null como "segue sem
// captcha", e o servidor decide se bloqueia (também sem a secret key, não bloqueia).
export async function getTurnstileToken(action: string): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey || typeof window === 'undefined') return null

  // Container temporário e invisível — o widget "invisible" não precisa de
  // espaço visual nenhum, só de um elemento no DOM pra se anexar.
  const container = document.createElement('div')
  container.style.display = 'none'
  document.body.appendChild(container)

  try {
    await loadScript()
    return await new Promise<string>((resolve, reject) => {
      window.turnstile!.render(container, {
        sitekey: siteKey,
        action,
        size: 'invisible',
        callback: (token) => resolve(token),
        'error-callback': () => reject(new Error('Turnstile falhou')),
      })
    })
  } catch {
    return null
  } finally {
    container.remove()
  }
}
