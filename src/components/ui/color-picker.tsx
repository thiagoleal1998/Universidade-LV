'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value)
}

// Paleta de atalhos + input nativo de cor (paleta do SO) + campo de hex direto
// — as 3 formas escrevem no mesmo state, via onChange. Não é o mesmo
// componente do seletor de cor de tag (`tags-manager.tsx`) de propósito: esse
// tem compatibilidade com chaves antigas ("blue", "green"...) que não existem
// aqui — hex é o único formato salvo desde o início neste uso.
export function ColorPicker({
  color, onChange, presets, swatchSize = 'w-6 h-6',
}: {
  color: string
  onChange: (hex: string) => void
  presets: string[]
  swatchSize?: string
}) {
  const [hexInput, setHexInput] = useState(color)

  function commitHex(value: string) {
    setHexInput(value)
    if (isValidHex(value)) onChange(value)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1.5">
        {presets.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => { onChange(hex); setHexInput(hex) }}
            title={hex}
            style={{ background: hex }}
            className={cn(
              'rounded-full transition-all shrink-0 border border-border/50', swatchSize,
              color.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-offset-1 ring-foreground scale-110' : 'opacity-70 hover:opacity-100'
            )}
          />
        ))}
      </div>
      <input
        type="color"
        value={isValidHex(color) ? color : '#ffffff'}
        onChange={(e) => { onChange(e.target.value); setHexInput(e.target.value) }}
        className="w-7 h-7 rounded cursor-pointer border border-border p-0 bg-transparent"
        title="Escolher na paleta"
      />
      <input
        type="text"
        value={hexInput}
        onChange={(e) => commitHex(e.target.value)}
        placeholder="#ffffff"
        maxLength={7}
        className="w-20 text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}
