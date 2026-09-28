import { cn } from '@/lib/utils'

// Texto livre de destaque sobre a capa (ex.: "7x6", "30% OFF") — canto
// inferior direito, oposto à logo (que fica no superior esquerdo). Sem
// `'use client'`: é só JSX puro, compartilhado entre admin e membro.
export function HighlightBadge({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-sm',
        className
      )}
    >
      {text}
    </span>
  )
}
