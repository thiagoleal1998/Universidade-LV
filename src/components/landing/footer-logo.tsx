'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const LOGO_LIGHT = 'https://jfhbwnbihtdwoesjtlbz.supabase.co/storage/v1/object/public/lesson-photos/logos/litoral-verde-operadora-trimmed-1790795916008.webp'
const LOGO_DARK = 'https://jfhbwnbihtdwoesjtlbz.supabase.co/storage/v1/object/public/lesson-photos/logos/litoral-verde-operadora-dark-1790798666355.webp'

// No modo claro, a logo colorida tem texto escuro ("OPERADORA") que fica
// ilegível sem um fundo branco atrás. No modo escuro usamos uma versão
// totalmente branca da mesma logo — aí o fundo branco deixa de fazer
// sentido (a logo já se destaca sozinha sobre o footer escuro; um fundo
// branco atrás dela a deixaria invisível, branco sobre branco).
export function FooterLogo() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  if (isDark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={LOGO_DARK} alt="Litoral Verde Operadora" className="h-[54px] w-auto object-contain" />
    )
  }

  return (
    <div className="bg-white rounded-md px-2 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_LIGHT} alt="Litoral Verde Operadora" className="h-[54px] w-auto object-contain" />
    </div>
  )
}
