import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { Briefcase, Trophy, MapPin, Globe, Gift, ScrollText, Paperclip, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { detectPremiacaoIcon } from '@/lib/premiacao-icons'

export const metadata = { title: 'Condições Comerciais' }

function toEmbedUrl(url: string): string {
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  }
  return url
}

type PremiacaoItem = { texto: string; especificacoes: string }

type CorridaData = {
  tipo: 'nacional' | 'internacional'
  titulo: string
  descricao: string
  destino: string
  premiacao_titulo: string
  premiacao: PremiacaoItem[]
  regras: string
  lamina_url: string
}

function parseItem(raw: unknown): PremiacaoItem {
  if (typeof raw === 'string') return { texto: raw, especificacoes: '' }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      texto: typeof r.texto === 'string' ? r.texto : '',
      especificacoes: typeof r.especificacoes === 'string' ? r.especificacoes : '',
    }
  }
  return { texto: '', especificacoes: '' }
}

function parseCorridaData(raw: string): CorridaData {
  try {
    const p = JSON.parse(raw)
    return {
      tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
      titulo: typeof p.titulo === 'string' ? p.titulo : '',
      descricao: typeof p.descricao === 'string' ? p.descricao : '',
      destino: typeof p.destino === 'string' ? p.destino : '',
      premiacao_titulo: typeof p.premiacao_titulo === 'string' ? p.premiacao_titulo : '',
      premiacao: Array.isArray(p.premiacao) ? p.premiacao.map(parseItem) : [],
      regras: typeof p.regras === 'string' ? p.regras : '',
      lamina_url: typeof p.lamina_url === 'string' ? p.lamina_url : '',
    }
  } catch {
    return { tipo: 'nacional', titulo: '', descricao: '', destino: '', premiacao_titulo: '', premiacao: [], regras: '', lamina_url: '' }
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
  const corridaEmpty = !corrida.titulo.trim() && !corrida.descricao.trim() && !corrida.destino.trim() && corrida.premiacao.length === 0 && !corrida.regras.trim() && !corrida.lamina_url
  const corridaIso = detectIso(corrida.destino)

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

      {/* Condições Comerciais */}
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

      {/* Corrida de vendas */}
      {activeKey === 'corrida_vendas' && (
        corridaEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
            <Trophy className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhuma corrida de vendas disponível no momento.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-2xl space-y-6">
              {/* Título */}
              {corrida.titulo && (
                <h1 className="text-2xl font-bold text-foreground">{corrida.titulo}</h1>
              )}

              {/* Tipo + Destino */}
              <div className="flex items-center gap-3 flex-wrap">
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
                {corrida.destino && (
                  <span className="flex items-center gap-2 text-lg font-bold text-foreground">
                    {corridaIso && (
                      <img
                        src={flagImgUrl(corridaIso, '32x24')}
                        srcSet={`${flagImgUrl(corridaIso, '48x36')} 2x`}
                        width={32}
                        height={24}
                        alt="Bandeira"
                        className="rounded-sm object-cover"
                      />
                    )}
                    {corrida.destino}
                  </span>
                )}
              </div>

              {/* Descrição */}
              {corrida.descricao && corrida.descricao !== '<p></p>' && (
                <div
                  className="rich-text text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: corrida.descricao }}
                />
              )}

              {/* Lâmina */}
              {corrida.lamina_url && (
                <a
                  href={corrida.lamina_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Ver lâmina da corrida
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              )}

              {/* Premiação */}
              {corrida.premiacao.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-foreground">Premiação</h2>
                <div className="bg-card border rounded-xl p-5 space-y-4">
                  {corrida.premiacao_titulo && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-500" />
                    <h3 className="font-semibold text-foreground">
                      {corrida.premiacao_titulo}
                    </h3>
                  </div>
                  )}
                  <ul className="space-y-3">
                    {corrida.premiacao.map((item, idx) => {
                      const Icon = detectPremiacaoIcon(item.texto)
                      return (
                        <li key={idx} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="text-sm font-medium text-foreground">{item.texto}</span>
                          </div>
                          {item.especificacoes && (
                            <p className="text-xs text-muted-foreground ml-10 leading-relaxed">
                              {item.especificacoes}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                </div>
              )}

              {/* Regras */}
              {corrida.regras && corrida.regras !== '<p></p>' && (
                <div className="bg-card border rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-foreground">Regras</h2>
                  </div>
                  <div
                    className="rich-text"
                    dangerouslySetInnerHTML={{ __html: corrida.regras }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
