'use client'

import { useEffect, useState } from 'react'

export function CookieBanner({
  text,
  buttonText = 'Aceitar e continuar',
  linkText,
  linkUrl,
}: {
  text: string
  buttonText?: string
  linkText?: string
  linkUrl?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true)
    } catch {}
  }, [])

  function accept() {
    try { localStorage.setItem('cookie_consent', '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  const hasPlaceholder = linkText && linkUrl && text.includes('{link}')
  const hasAppended = linkText && linkUrl && !text.includes('{link}')
  const parts = hasPlaceholder ? text.split('{link}') : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/97 backdrop-blur-md px-4 py-3 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        <p className="flex-1 text-xs text-muted-foreground text-center sm:text-left leading-relaxed">
          {parts ? (
            <>
              {parts[0]}
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                {linkText}
              </a>
              {parts[1]}
            </>
          ) : hasAppended ? (
            <>
              {text}{' '}
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                {linkText}
              </a>
            </>
          ) : (
            text
          )}
        </p>
        <button
          onClick={accept}
          className="shrink-0 bg-green-700 hover:bg-green-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
