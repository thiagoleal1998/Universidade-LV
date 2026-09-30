'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trophy, MapPin, Globe, Calendar, ChevronRight } from 'lucide-react'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { CorridaCard, type CorridaData } from './corrida-card'

// Cards resumidos lado a lado (grid), que abrem o conteúdo completo da
// corrida (CorridaCard) num Dialog ao clicar — mesmo padrão já usado em
// CommercialConditionsGrid. Antes as corridas de uma mesma sub-aba
// (Próximas/Em andamento/Finalizadas) apareciam TODAS empilhadas, cada
// uma com o conteúdo inteiro visível de uma vez — pedido do usuário pra
// facilitar a visualização com várias corridas cadastradas.
export function CorridasVendasGrid({ corridas }: { corridas: CorridaData[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const open = openIdx !== null ? corridas[openIdx] : null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {corridas.map((corrida, idx) => {
          const iso = detectIso(corrida.destino)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setOpenIdx(idx)}
              className="group block text-left rounded-2xl border border-border overflow-hidden bg-card hover:shadow-md transition-all"
            >
              <div className="relative flex items-center justify-center h-28 bg-muted/30 overflow-hidden">
                {corrida.parceiro_logo_url ? (
                  <>
                    <img
                      src={corrida.parceiro_logo_url}
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl opacity-25 dark:opacity-15 pointer-events-none select-none"
                    />
                    <img
                      src={corrida.parceiro_logo_url}
                      alt="Parceiro"
                      className="relative z-10 object-contain max-h-16 max-w-[70%]"
                    />
                  </>
                ) : (
                  <Trophy className="w-8 h-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="p-4 space-y-2">
                {corrida.titulo && (
                  <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {corrida.titulo}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {corrida.tipo === 'nacional' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[11px] font-semibold">
                      <MapPin className="w-3 h-3" />Nacional
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-[11px] font-semibold">
                      <Globe className="w-3 h-3" />Internacional
                    </span>
                  )}
                  {corrida.destino && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {iso && <img src={flagImgUrl(iso, '20x15')} width={16} height={12} alt="" className="rounded-sm object-cover" />}
                      {corrida.destino}
                    </span>
                  )}
                </div>
                {corrida.periodo && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {corrida.periodo}
                  </p>
                )}
                <span className="flex items-center gap-1 text-xs text-primary pt-1">
                  Ver detalhes <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpenIdx(null) }}>
        <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">{open.titulo || 'Corrida de vendas'}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto pr-1">
                <CorridaCard corrida={open} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
