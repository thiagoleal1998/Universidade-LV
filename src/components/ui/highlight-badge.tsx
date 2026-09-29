import { cn } from '@/lib/utils'

// Cor quente fixa pra CTA/destaque que precisa chamar atenção de verdade —
// pedido do usuário: `bg-primary` (tema, normalmente verde) não se destaca o
// suficiente sobre uma foto ou entre outros elementos da tela. Hex fixo, não
// a cor primária do tema (que o admin pode mudar pra qualquer coisa) — cor
// arbitrária em runtime não vira classe Tailwind, por isso via `style` inline
// (mesmo padrão já usado pra `logo_bg_color`/tag color no projeto).
export const ATTENTION_COLOR = '#ff6900'

// Texto livre de destaque sobre a capa (ex.: "7x6", "30% OFF") — canto
// inferior direito, oposto à logo (que fica no superior esquerdo). Sem
// `'use client'`: é só JSX puro, compartilhado entre admin e membro.
export function HighlightBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-bold text-white shadow-sm', className)}
      style={{ backgroundColor: ATTENTION_COLOR }}
    >
      {text}
    </span>
  )
}
