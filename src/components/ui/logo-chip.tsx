import { cn } from '@/lib/utils'

// Fundo padrão do chip — a maioria das logos (escuras/coloridas) lê bem em
// branco; o admin troca só quando a logo específica for clara/branca (senão
// fica invisível direto sobre a foto de capa, bug real relatado pelo usuário
// em Condição Comercial). Compartilhado entre o form/lista admin e o
// card/modal do membro — sem `'use client'`: é só JSX puro, sem estado.
export const DEFAULT_LOGO_BG = '#ffffff'

export function LogoChip({
  logoUrl, bgColor, className, imgClassName,
}: {
  logoUrl: string
  bgColor: string
  className?: string
  imgClassName?: string
}) {
  return (
    <div
      className={cn('inline-flex items-center justify-center rounded-lg shadow-sm', className)}
      style={{ backgroundColor: bgColor || DEFAULT_LOGO_BG }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="" referrerPolicy="no-referrer" className={cn('object-contain', imgClassName)} />
    </div>
  )
}
