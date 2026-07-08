import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { Briefcase, Trophy, MapPin, Globe, Gift, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Condições Comerciais' }

function toEmbedUrl(url: string): string {
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  }
  return url
}

type CorridaData = {
  tipo: 'nacional' | 'internacional'
  premiacao: string[]
  regras: string
}

function parseCorridaData(raw: string): CorridaData {
  try {
    const p = JSON.parse(raw)
    return {
      tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
      premiacao: Array.isArray(p.premiacao) ? p.premiacao : [],
      regras: typeof p.regras === 'string' ? p.regras : '',
    }
  } catch {
    return { tipo: 'nacional', premiacao: [], regras: '' }
  }
}

const TABS = [
  { key: 'comercial',      label: 'Condições Comerciais', icon: Briefcase },
  { key: 'corrida_vendas', label: 'Corrida de vendas',    icon: Trophy    },
] as const

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeKey = TABS.find((t) => t.key === tab)?.key ?? 'comercial'

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const [{ data: itemsData }, settings] = await Promise.all([
    adminClient
      .from('marketing_items')
      .select('url, title')
      .eq('category', 'comercial')
      .neq('status', 'draft')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('order_index')
      .limit(1),
    getSettings(),
  ])

  const comercialItem = itemsData?.[0] as { url: string; title: string } | undefined
  const corrida = parseCorridaData(settings.corrida_vendas)
  const corridaEmpty = corrida.premiacao.length === 0 && !corrida.regras.trim()

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      {/* Abas */}
      <div className="flex items-center gap-0 border-b border-border shrink-0 bg-card px-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`?tab=${key}`}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeKey === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Conteúdo da aba Condições Comerciais */}
      {activeKey === 'comercial' && (
        !comercialItem?.url ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
            <Briefcase className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhuma condição comercial disponível no momento.</p>
          </div>
        ) : (
          <iframe
            src={toEmbedUrl(comercialItem.url)}
            className="flex-1 w-full border-0"
            title="Condições Comerciais"
            allow="clipboard-read; clipboard-write"
          />
        )
      )}

      {/* Conteúdo da aba Corrida de vendas */}
      {activeKey === 'corrida_vendas' && (
        corridaEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
            <Trophy className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhuma corrida de vendas disponível no momento.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-2xl space-y-6">
              {/* Tipo */}
              <div className="flex items-center gap-2">
                {corrida.tipo === 'nacional' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    Nacional
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-sm font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    Internacional
                  </span>
                )}
              </div>

              {/* Premiação */}
              {corrida.premiacao.length > 0 && (
                <div className="bg-card border rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-500" />
                    <h2 className="font-semibold text-foreground">Premiação</h2>
                  </div>
                  <ul className="space-y-2">
                    {corrida.premiacao.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regras */}
              {corrida.regras.trim() && (
                <div className="bg-card border rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-foreground">Regras</h2>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {corrida.regras}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
