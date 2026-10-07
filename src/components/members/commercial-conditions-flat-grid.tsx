'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'
import { ConditionBoxes } from '@/components/ui/condition-boxes'
import { CommercialConditionFlatCard } from '@/components/members/commercial-condition-flat-card'
import { toRichHtml } from '@/lib/legacy-rich-text'
import { Briefcase, Calendar, ExternalLink } from 'lucide-react'

type Condition = {
  id: string
  title: string
  description: string | null
  logo_url: string | null
  logo_bg_color: string | null
  url: string | null
  expires_at: string | null
  conditions: string[] | null
}

// Só a parte que pode crescer bastante (descrição + caixinhas de condição),
// sem logo/título/validade — reaproveitado dentro da prévia truncada abaixo.
// `expires_at` fica de fora de propósito (ver `FlatCardPreview`): a validade
// precisa continuar visível mesmo quando o resto é cortado pelo "Veja mais".
// O modal (clique em "Veja mais") usa `CommercialConditionFlatCard` inteiro,
// não truncado.
function FlatCardBody({ c }: { c: Condition }) {
  return (
    <>
      {c.description && c.description !== '<p></p>' && (
        <div className="rich-text rich-text-muted text-sm" dangerouslySetInnerHTML={{ __html: toRichHtml(c.description) }} />
      )}
      <ConditionBoxes items={c.conditions} />
      {c.url && (
        <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <ExternalLink className="w-3.5 h-3.5" /> Abrir link
        </a>
      )}
    </>
  )
}

// Card com o corpo limitado em altura — com várias condições separadas, o
// card "modelo 2" podia ficar enorme na grade. Mede se o conteúdo real passa
// do limite (mesmo padrão já usado no "Ler mais" de depoimento,
// `TestimonialCard` em trip-media-sections.tsx) e só mostra "Veja mais"
// quando precisa de fato.
function FlatCardPreview({ c, onOpen }: { c: Condition; onOpen: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const check = () => setTruncated(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [c.description, c.conditions])

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
      {c.logo_url ? (
        <LogoChip logoUrl={c.logo_url} bgColor={c.logo_bg_color || DEFAULT_LOGO_BG} className="w-20 h-20 shrink-0" imgClassName="w-full h-full p-2.5" />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
          <Briefcase className="w-7 h-7 text-muted-foreground/50" />
        </div>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <p className="font-semibold text-foreground">{c.title}</p>
        <div className="relative">
          <div ref={bodyRef} className="max-h-[180px] overflow-hidden space-y-2 mt-2">
            <FlatCardBody c={c} />
          </div>
          {truncated && (
            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>
        {c.expires_at && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            Válido até {new Date(c.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
        {truncated && (
          <button type="button" onClick={onOpen} className="mt-2 text-sm font-medium text-primary hover:underline">
            Veja mais
          </button>
        )}
      </div>
    </div>
  )
}

export function CommercialConditionsFlatGrid({ items }: { items: Condition[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = items.find((c) => c.id === openId) ?? null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((c) => (
          <FlatCardPreview key={c.id} c={c} onOpen={() => setOpenId(c.id)} />
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpenId(null) }}>
        <DialogContent className="max-h-[85vh] flex flex-col overflow-y-auto sm:max-w-lg">
          {open && <CommercialConditionFlatCard c={open} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
