'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogoChip } from '@/components/ui/logo-chip'
import { HighlightBadge } from '@/components/ui/highlight-badge'
import { toRichHtml } from '@/lib/legacy-rich-text'
import { Briefcase, ExternalLink, Calendar } from 'lucide-react'

type Condition = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  logo_url: string | null
  logo_bg_color: string | null
  highlight_text: string | null
  url: string | null
  expires_at: string | null
}

// Card abre um modal com a condição completa (título + descrição inteira,
// sem o `line-clamp-2` do card) em vez de navegar direto pro `url` — antes o
// card inteiro era um `<a href={c.url}>`, e sem `url` preenchido (comum: é
// um campo opcional, "Link de detalhes") o card não fazia NADA ao clicar,
// sem nenhum jeito de ler a condição completa. `url`, quando existe, vira um
// botão "Abrir link" dentro do modal — não é mais o único jeito de ver o
// conteúdo.
export function CommercialConditionsGrid({ items }: { items: Condition[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = items.find((c) => c.id === openId) ?? null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="group block text-left rounded-2xl border border-border overflow-hidden bg-card hover:shadow-md transition-all"
          >
            <div className="relative">
              {c.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover_url} alt={c.title} referrerPolicy="no-referrer" className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              {c.logo_url && (
                <LogoChip
                  logoUrl={c.logo_url}
                  bgColor={c.logo_bg_color ?? ''}
                  className="absolute top-2 left-2 max-w-[110px] px-2 py-1.5"
                  imgClassName="h-6 w-auto max-w-full"
                />
              )}
              {c.highlight_text && (
                <HighlightBadge text={c.highlight_text} className="absolute bottom-2 right-2" />
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                {c.title}
              </p>
              {c.description && c.description !== '<p></p>' && (
                <div className="rich-text text-xs text-muted-foreground mt-1.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: toRichHtml(c.description) }} />
              )}
              <span className="flex items-center gap-1 text-xs text-primary mt-2">
                Ver condições
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpenId(null) }}>
        <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg">
          {open && (
            <>
              {(open.cover_url || open.logo_url || open.highlight_text) && (
                <div className="relative">
                  {open.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={open.cover_url} alt={open.title} referrerPolicy="no-referrer" className="w-full aspect-video object-cover rounded-lg" />
                  ) : (
                    // Sem capa, mas com logo/destaque: mostra num fundo neutro
                    // em vez de escondê-los — mesmo comportamento do card.
                    <div className="w-full aspect-video bg-muted/40 rounded-lg flex items-center justify-center" />
                  )}
                  {open.logo_url && (
                    <LogoChip
                      logoUrl={open.logo_url}
                      bgColor={open.logo_bg_color ?? ''}
                      className="absolute top-2 left-2 max-w-[130px] px-2.5 py-2"
                      imgClassName="h-7 w-auto max-w-full"
                    />
                  )}
                  {open.highlight_text && (
                    <HighlightBadge text={open.highlight_text} className="absolute bottom-2 right-2 text-sm px-2.5 py-1.5" />
                  )}
                </div>
              )}
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto pr-1 space-y-4">
                {open.description && open.description !== '<p></p>' && (
                  <div className="rich-text text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: toRichHtml(open.description) }} />
                )}
                {open.expires_at && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    Válido até {new Date(open.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
                {open.url && (
                  <a
                    href={open.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir link
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
