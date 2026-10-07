// Lista de condições separadas (ex.: "Fique 4 noites e pague 3", "20% OFF")
// renderizadas cada uma na própria caixinha — substitui o hábito do admin de
// digitar "========" dentro da descrição pra separar condições diferentes
// dentro do mesmo item. Puro, sem 'use client': compartilhado entre o card
// "modelo 1" (grid com modal) e o card "modelo 2" (flat, sem modal).
export function ConditionBoxes({ items, className, showLabel = true }: { items: string[] | null | undefined; className?: string; showLabel?: boolean }) {
  const list = (items ?? []).filter((t) => t.trim())
  if (list.length === 0) return null
  return (
    <div className={className}>
      {showLabel && <p className="text-xs font-semibold text-foreground mb-1.5">Confira as condições:</p>}
      <div className="space-y-1.5">
        {list.map((text, i) => (
          <div key={i} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
