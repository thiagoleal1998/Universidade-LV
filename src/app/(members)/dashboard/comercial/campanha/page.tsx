import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { ArrowLeft, Megaphone, Briefcase, Leaf } from 'lucide-react'
import Link from 'next/link'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'
import { CommercialConditionsGrid } from '@/components/members/commercial-conditions-grid'

export const metadata = { title: 'Condições especiais da campanha' }

// Página pra onde o banner de campanha (Admin → Comercial → Condições
// Comerciais → "Banner de campanha") leva ao ser clicado — lista os
// parceiros/condições cadastrados em `commercial_banner_items`, uma tabela
// separada de `commercial_conditions` de propósito (decisão do usuário).
// As Condições Comerciais "normais" (`commercial_conditions`) também
// aparecem aqui — enquanto o banner está ativo, elas saem da tela principal
// de Comercial (que mostra só o banner) e só existem nesta página.
export default async function CampanhaComercialPage() {
  const adminClient = createAdminClient()
  const [{ data }, { data: conditionsData }, settings] = await Promise.all([
    adminClient
      .from('commercial_banner_items')
      .select('id, partner_name, condition_text, logo_url')
      .order('order_index'),
    adminClient
      .from('commercial_conditions')
      .select('id, title, description, cover_url, logo_url, logo_bg_color, highlight_text, url, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    getSettings(),
  ])

  const items = data ?? []

  // Mesmo critério de "válido até" já usado na tela principal de Comercial:
  // inclusivo do próprio dia, some só a partir do dia seguinte.
  const todayStr = new Date().toISOString().slice(0, 10)
  const commercialConditions = (conditionsData ?? []).filter((c) => !c.expires_at || c.expires_at >= todayStr)

  // Espaço próprio pras condições da própria Litoral Verde (não é um
  // "parceiro" — é a operadora), separado da lista de parceiros de propósito.
  // Mesmo blob JSON do banner (`settings.commercial_banner`), sem tabela nova.
  let lvConditions = ''
  try {
    const parsed = JSON.parse(settings.commercial_banner)
    if (typeof parsed?.lv_conditions === 'string') lvConditions = parsed.lv_conditions.trim()
  } catch {}

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/comercial" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Condições Comerciais
        </Link>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Condições especiais da campanha</h1>
        </div>
      </div>

      {lvConditions && (
        <div className="bg-primary/5 border border-primary/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Condições Litoral Verde</h2>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lvConditions}</p>
        </div>
      )}

      {items.length === 0 && commercialConditions.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-muted-foreground border border-dashed rounded-xl">
          <Briefcase className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhuma condição cadastrada para esta campanha ainda.</p>
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
                  {item.logo_url ? (
                    <LogoChip logoUrl={item.logo_url} bgColor={DEFAULT_LOGO_BG} className="w-20 h-20 shrink-0" imgClassName="w-full h-full p-2.5" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                      <Briefcase className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="font-semibold text-foreground">{item.partner_name}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{item.condition_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {commercialConditions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">Confira mais condições:</h2>
              <CommercialConditionsGrid items={commercialConditions} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
