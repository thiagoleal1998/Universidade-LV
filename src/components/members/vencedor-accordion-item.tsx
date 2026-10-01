'use client'

import { useState } from 'react'
import { Award, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { detectEstadoBR, estadoFlagUrl } from '@/lib/estado-flag'
import { detectPremiacaoIcon } from '@/lib/premiacao-icons'
import type { Vencedor, PremiacaoSection } from '@/components/members/corrida-card'

const EASE = 'cubic-bezier(0.16,1,0.3,1)'

function badgeClasses(pos: string) {
  if (/1[°º]|1\s*lugar|ouro|gold/i.test(pos))
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
  if (/2[°º]|2\s*lugar|prata|silver/i.test(pos))
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  if (/3[°º]|3\s*lugar|bronze/i.test(pos))
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
  return 'bg-muted text-muted-foreground border-border'
}

export function VencedorAccordionItem({ vencedor: v, premiacoes }: { vencedor: Vencedor; premiacoes: PremiacaoSection[] }) {
  const [open, setOpen] = useState(false)
  const pos = v.posicao.trim()
  const bc = badgeClasses(pos)
  const hasDetails = premiacoes.some((s) => s.itens.length > 0)

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-muted/30 transition-colors',
          !hasDetails && 'cursor-default',
        )}
      >
        {v.logo_url ? (
          <div className="shrink-0 flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <img
              src={v.logo_url}
              alt={v.nome}
              className="object-contain rounded"
              style={{ maxHeight: 44, maxWidth: 44, width: 'auto', height: 'auto' }}
            />
          </div>
        ) : (
          <div className={cn('w-11 h-11 rounded-full border flex items-center justify-center shrink-0', bc)}>
            <Award className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pos && <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border shrink-0', bc)}>{pos}</span>}
            <span className="font-semibold text-foreground">{v.nome}</span>
          </div>
          {v.agencia && <p className="text-sm text-muted-foreground mt-0.5">{v.agencia}</p>}
          {v.descricao && (() => {
            const estadoSigla = detectEstadoBR(v.descricao)
            const flagSrc = estadoSigla
              ? estadoFlagUrl(estadoSigla)
              : (() => { const iso = detectIso(v.descricao); return iso ? flagImgUrl(iso, '20x15') : null })()
            return (
              <span className="flex items-center gap-1.5 mt-0.5">
                {flagSrc && (
                  <img src={flagSrc} width={18} height={13} alt="" className="rounded-sm object-contain shrink-0" style={{ width: 18, height: 13 }} />
                )}
                <span className="text-xs text-muted-foreground">{v.descricao}</span>
              </span>
            )
          })()}
        </div>

        {hasDetails && (
          <svg
            className={cn('w-4 h-4 text-muted-foreground shrink-0', open && 'rotate-180')}
            style={{ transition: `transform 300ms ${EASE}` }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {hasDetails && (
        <div
          className="grid"
          style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 300ms ${EASE}` }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-border px-5 pb-5 pt-4 space-y-4 bg-muted/20">
              {premiacoes.map((section, sIdx) =>
                section.itens.length === 0 ? null : (
                  <div key={sIdx} className="space-y-2">
                    {section.titulo && (
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{section.titulo}</span>
                      </div>
                    )}
                    <ul className="space-y-2">
                      {section.itens.map((item, idx) => {
                        const Icon = detectPremiacaoIcon(item.texto)
                        return (
                          <li key={idx} className="space-y-0.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                                <Icon className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <span className="text-sm text-foreground">{item.texto}</span>
                            </div>
                            {item.especificacoes && <p className="text-xs text-muted-foreground ml-8">{item.especificacoes}</p>}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
