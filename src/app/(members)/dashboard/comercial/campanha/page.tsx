import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { ArrowLeft, Megaphone, Briefcase, Leaf } from 'lucide-react'
import Link from 'next/link'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'

export const metadata = { title: 'Condições especiais da campanha' }

// Página pra onde o banner de campanha (Admin → Comercial → Condições
// Comerciais → "Banner de campanha") leva ao ser clicado — lista os
// parceiros/condições cadastrados em `commercial_banner_items`, uma tabela
// separada de `commercial_conditions` de propósito (decisão do usuário).
export default async function CampanhaComercialPage() {
  const adminClient = createAdminClient()
  const [{ data }, settings] = await Promise.all([
    adminClient
      .from('commercial_banner_items')
      .select('id, partner_name, condition_text, logo_url')
      .order('order_index'),
    getSettings(),
  ])

  const items = data ?? []

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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3 text-muted-foreground border border-dashed rounded-xl">
          <Briefcase className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhuma condição cadastrada para esta campanha ainda.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold w-16">Logo</th>
                <th className="px-4 py-3 font-semibold">Parceiro</th>
                <th className="px-4 py-3 font-semibold">Condição especial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    {item.logo_url ? (
                      <LogoChip logoUrl={item.logo_url} bgColor={DEFAULT_LOGO_BG} className="w-11 h-11" imgClassName="w-full h-full p-1.5" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-muted/40 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{item.partner_name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-pre-wrap">{item.condition_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
