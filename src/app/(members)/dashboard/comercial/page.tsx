import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import {
  Briefcase, Trophy, MapPin, Globe, Gift, ScrollText,
  Paperclip, ExternalLink, Clock, PlayCircle, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { detectPremiacaoIcon } from '@/lib/premiacao-icons'

export const metadata = { title: 'Condições Comerciais' }

function toEmbedUrl(url: string): string {
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  return url
}

// ── Tipos ──────────────────────────────────────────────────────────────────

type Status = 'proxima' | 'em_andamento' | 'finalizada'
type PremiacaoItem = { texto: string; especificacoes: string }
type PremiacaoSection = { titulo: string; itens: PremiacaoItem[] }

type CorridaData = {
  status: Status
  tipo: 'nacional' | 'internacional'
  titulo: string
  descricao: string
  destino: string
  premiacoes: PremiacaoSection[]
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

function parseSection(raw: unknown): PremiacaoSection {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      titulo: typeof r.titulo === 'string' ? r.titulo : '',
      itens: Array.isArray(r.itens) ? r.itens.map(parseItem) : [],
    }
  }
  return { titulo: '', itens: [] }
}

function parseSingle(p: Record<string, unknown>): CorridaData {
  const s = p.status as string
  const status: Status = ['proxima', 'em_andamento', 'finalizada'].includes(s) ? (s as Status) : 'em_andamento'

  let premiacoes: PremiacaoSection[]
  if (Array.isArray(p.premiacoes)) {
    premiacoes = p.premiacoes.map(parseSection)
  } else {
    premiacoes = [{
      titulo: typeof p.premiacao_titulo === 'string' ? p.premiacao_titulo : '',
      itens: Array.isArray(p.premiacao) ? p.premiacao.map(parseItem) : [],
    }]
  }

  return {
    status,
    tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
    titulo: typeof p.titulo === 'string' ? p.titulo : '',
    descricao: typeof p.descricao === 'string' ? p.descricao : '',
    destino: typeof p.destino === 'string' ? p.destino : '',
    premiacoes,
    regras: typeof p.regras === 'string' ? p.regras : '',
    lamina_url: typeof p.lamina_url === 'string' ? p.lamina_url : '',
  }
}

function parseList(raw: string): CorridaData[] {
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.map((x) => parseSingle(x as Record<string, unknown>))
    if (p && typeof p === 'object') return [parseSingle(p as Record<string, unknown>)]
    return []
  } catch {
    return []
  }
}

// ── Sub-tabs config ────────────────────────────────────────────────────────

const SUBTABS = [
  {
    key: 'proximas',
    label: 'Próximas',
    filter: (c: CorridaData) => c.status === 'proxima',
    icon: Clock,
    emptyMsg: 'Nenhuma corrida futura cadastrada.',
    activeClass: 'bg-blue-500 text-white border-blue-500',
    inactiveClass: 'border-border text-muted-foreground hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:hover:border-blue-800',
  },
  {
    key: 'em_andamento',
    label: 'Em andamento',
    filter: (c: CorridaData) => c.status === 'em_andamento',
    icon: PlayCircle,
    emptyMsg: 'Nenhuma corrida em andamento no momento.',
    activeClass: 'bg-green-500 text-white border-green-500',
    inactiveClass: 'border-border text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/40 dark:hover:text-green-300 dark:hover:border-green-800',
  },
  {
    key: 'finalizadas',
    label: 'Finalizadas',
    filter: (c: CorridaData) => c.status === 'finalizada',
    icon: CheckCircle2,
    emptyMsg: 'Nenhuma corrida finalizada ainda.',
    activeClass: 'bg-muted text-muted-foreground border-border',
    inactiveClass: 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  },
] as const

type SubtabKey = typeof SUBTABS[number]['key']

// ── Componente de uma corrida ─────────────────────────────────────────────

function CorridaCard({ corrida }: { corrida: CorridaData }) {
  const iso = detectIso(corrida.destino)
  return (
    <div className="space-y-5">
      {corrida.titulo && <h2 className="text-xl font-bold text-foreground">{corrida.titulo}</h2>}

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
            {iso && (
              <img
                src={flagImgUrl(iso, '32x24')}
                srcSet={`${flagImgUrl(iso, '48x36')} 2x`}
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

      {corrida.descricao && corrida.descricao !== '<p></p>' && (
        <div className="rich-text text-muted-foreground" dangerouslySetInnerHTML={{ __html: corrida.descricao }} />
      )}

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

      {corrida.premiacoes.some((s) => s.itens.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Premiação</h3>
          {corrida.premiacoes.map((section, sIdx) =>
            section.itens.length === 0 ? null : (
              <div key={sIdx} className="bg-card border rounded-xl p-5 space-y-4">
                {section.titulo && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold text-foreground">{section.titulo}</span>
                  </div>
                )}
                <ul className="space-y-3">
                  {section.itens.map((item, idx) => {
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
                          <p className="text-xs text-muted-foreground ml-10 leading-relaxed">{item.especificacoes}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ),
          )}
        </div>
      )}

      {corrida.regras && corrida.regras !== '<p></p>' && (
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Regras</h3>
          </div>
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: corrida.regras }} />
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: 'comercial',      label: 'Condições Comerciais', icon: Briefcase },
  { key: 'corrida_vendas', label: 'Corrida de vendas',    icon: Trophy    },
] as const

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; subtab?: string }>
}) {
  const { tab, subtab } = await searchParams
  const activeTab = MAIN_TABS.find((t) => t.key === tab)?.key ?? 'comercial'
  const activeSubtab: SubtabKey = (['proximas', 'em_andamento', 'finalizadas'] as const).includes(subtab as SubtabKey)
    ? (subtab as SubtabKey)
    : 'em_andamento'

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
  const allCorridas = parseList(settings.corrida_vendas)

  const subtabData = SUBTABS.find((s) => s.key === activeSubtab)!
  const filteredCorridas = allCorridas.filter(subtabData.filter)

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      {/* Abas principais */}
      <div className="flex items-center gap-0 border-b border-border shrink-0 bg-card px-2">
        {MAIN_TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={key === 'corrida_vendas' ? `?tab=${key}&subtab=${activeSubtab}` : `?tab=${key}`}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key
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
      {activeTab === 'comercial' && (
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
      {activeTab === 'corrida_vendas' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sub-tabs */}
          <div className="flex items-center gap-2 border-b border-border shrink-0 bg-background px-4 py-2.5">
            {SUBTABS.map(({ key, label, icon: Icon, activeClass, inactiveClass }) => (
              <Link
                key={key}
                href={`?tab=corrida_vendas&subtab=${key}`}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all whitespace-nowrap',
                  activeSubtab === key ? activeClass : inactiveClass,
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Conteúdo filtrado */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {filteredCorridas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-muted-foreground">
                <Trophy className="w-10 h-10 opacity-30" />
                <p className="text-sm">{subtabData.emptyMsg}</p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-10">
                {filteredCorridas.map((corrida, idx) => (
                  <div key={idx}>
                    {idx > 0 && <hr className="border-border mb-10" />}
                    <CorridaCard corrida={corrida} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
