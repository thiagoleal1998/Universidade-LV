'use client'

import { useState } from 'react'
import { Rocket, X } from 'lucide-react'

export function LaunchBanner({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !text) return null

  return (
    <div className="bg-green-800 text-white text-sm px-4 py-2.5 flex items-center justify-center gap-2.5 relative pr-10">
      <Rocket className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium text-center">{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
