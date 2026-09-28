'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { WinnersCarousel } from '@/components/members/winners-carousel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Region = { name: string; agency1: string; value1: string; agency2: string; value2: string }
type WinnersMonth = { month: string; regions: Region[] }

// Seção de "Vencedores do Mês" — client component (não a página inteira) só
// pra guardar QUAL mês está selecionado, já que o admin agora cadastra várias
// sessões (`months`, a mais recente sempre em `months[0]`) e o pedido do
// usuário foi poder ver as anteriores, não só a atual. `key={selectedIdx}` no
// WinnersCarousel força remontagem ao trocar de mês — sem isso o carrossel
// (que guarda posição de scroll em refs internas) ficaria com o índice
// dessincronizado do conteúdo novo.
export function TamojuntoWinnersSection({
  title, badge, months,
}: {
  title: string
  badge: string
  months: WinnersMonth[]
}) {
  // Só meses com rótulo preenchido aparecem no seletor — uma sessão em
  // branco (recém-criada pelo admin, ainda sem "Mês de referência") não vira
  // opção clicável sem nome nenhum pra identificar.
  const selectableMonths = months
    .map((m, i) => ({ ...m, index: i }))
    .filter((m) => m.month.trim())
  const [selectedIndex, setSelectedIndex] = useState(selectableMonths[0]?.index ?? 0)
  const current = months[selectedIndex] ?? months[0] ?? null

  return (
    <section className="rounded-2xl overflow-hidden border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-yellow-400/5 to-orange-400/5">
      <div className="p-5 sm:p-6">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          {badge && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded-full px-3 py-1">
              {badge}
            </span>
          )}

          {selectableMonths.length > 1 ? (
            <Select value={String(selectedIndex)} onValueChange={(v) => setSelectedIndex(Number(v))}>
              <SelectTrigger className="h-7 text-xs bg-background/50">
                <SelectValue>{() => current?.month || 'Selecione'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectableMonths.map((m) => (
                  <SelectItem key={m.index} value={String(m.index)}>
                    {m.month}{m.index === 0 ? ' (atual)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            current?.month && (
              <span className="text-xs font-semibold text-muted-foreground border border-border/60 bg-background/50 rounded-full px-3 py-1">
                {current.month}
              </span>
            )
          )}
        </div>

        {/* Carrossel de regiões */}
        <WinnersCarousel
          key={selectedIndex}
          regions={(current?.regions ?? []).filter((r) => r.agency1 || r.agency2)}
        />
      </div>
    </section>
  )
}
