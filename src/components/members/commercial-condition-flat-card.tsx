import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'
import { ConditionBoxes } from '@/components/ui/condition-boxes'
import { toRichHtml } from '@/lib/legacy-rich-text'
import { Briefcase, ExternalLink, Calendar } from 'lucide-react'

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

// "Modelo 2" — mesmo estilo flat já usado pros parceiros da campanha
// (`commercial_banner_items`, sem capa/modal/highlight): logo pequena ao
// lado, título, descrição e condições direto no corpo do card. Usado só na
// página /dashboard/comercial/campanha, pra ficar visualmente igual aos
// cards de parceiro que já existem ali — o grid "modelo 1" (capa grande +
// modal, `CommercialConditionsGrid`) continua sendo usado na tela principal
// de Comercial quando não há banner de campanha ativo.
export function CommercialConditionFlatCard({ c }: { c: Condition }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
      {c.logo_url ? (
        <LogoChip logoUrl={c.logo_url} bgColor={c.logo_bg_color || DEFAULT_LOGO_BG} className="w-20 h-20 shrink-0" imgClassName="w-full h-full p-2.5" />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
          <Briefcase className="w-7 h-7 text-muted-foreground/50" />
        </div>
      )}
      <div className="min-w-0 flex-1 pt-1 space-y-2">
        <p className="font-semibold text-foreground">{c.title}</p>
        {c.description && c.description !== '<p></p>' && (
          <div className="rich-text rich-text-muted text-sm" dangerouslySetInnerHTML={{ __html: toRichHtml(c.description) }} />
        )}
        <ConditionBoxes items={c.conditions} showLabel={false} />
        {c.expires_at && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            Válido até {new Date(c.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
        {c.url && (
          <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir link
          </a>
        )}
      </div>
    </div>
  )
}
