import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Megaphone, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'

export const metadata = { title: 'Condições especiais da campanha' }

// Página pra onde o banner de campanha (Admin → Comercial → Condições
// Comerciais → "Banner de campanha") leva ao ser clicado — lista os
// parceiros/condições cadastrados em `commercial_banner_items`, uma tabela
// separada de `commercial_conditions` de propósito (decisão do usuário).
export default async function CampanhaComercialPage() {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('commercial_banner_items')
    .select('id, partner_name, condition_text, logo_url')
    .order('order_index')

  const items = data ?? []

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
