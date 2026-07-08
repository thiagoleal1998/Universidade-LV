import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { Briefcase, Trophy, MapPin, Globe, Gift, ScrollText, Paperclip, ExternalLink } from 'lucide-react'
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
  destino: string
  premiacao: string[]
  regras: string
  lamina_url: string
}

function parseCorridaData(raw: string): CorridaData {
  try {
    const p = JSON.parse(raw)
    return {
      tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
      destino: typeof p.destino === 'string' ? p.destino : '',
      premiacao: Array.isArray(p.premiacao) ? p.premiacao : [],
      regras: typeof p.regras === 'string' ? p.regras : '',
      lamina_url: typeof p.lamina_url === 'string' ? p.lamina_url : '',
    }
  } catch {
    return { tipo: 'nacional', destino: '', premiacao: [], regras: '', lamina_url: '' }
  }
}

function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

const COUNTRY_MAP: [string[], string][] = [
  [['brasil', 'brazil', 'rio de janeiro', 'são paulo', 'fortaleza', 'florianopolis', 'florianópolis', 'natal', 'salvador', 'recife', 'maceio', 'maceió', 'porto seguro', 'foz do iguacu', 'foz do iguaçu'], 'BR'],
  [['argentina', 'buenos aires', 'bariloche', 'mendoza', 'patagonia', 'patagônia', 'calafate', 'ushuaia'], 'AR'],
  [['chile', 'santiago', 'atacama', 'valparaiso', 'torres del paine'], 'CL'],
  [['uruguai', 'uruguay', 'montevideo', 'montevidéu', 'punta del este'], 'UY'],
  [['paraguai', 'paraguay', 'assuncao', 'assunção'], 'PY'],
  [['peru', 'lima', 'machu picchu', 'cusco', 'cuzco', 'arequipa'], 'PE'],
  [['bolivia', 'bolívia', 'la paz', 'salar de uyuni', 'uyuni'], 'BO'],
  [['colombia', 'colômbia', 'bogota', 'bogotá', 'cartagena', 'medellin', 'medellín'], 'CO'],
  [['venezuela', 'caracas', 'isla margarita'], 'VE'],
  [['equador', 'ecuador', 'galápagos', 'galapagos', 'quito'], 'EC'],
  [['mexico', 'méxico', 'cancun', 'cancún', 'riviera maya', 'tulum', 'playa del carmen', 'cozumel', 'los cabos', 'puerto vallarta', 'guadalajara'], 'MX'],
  [['estados unidos', 'usa', 'eua', 'orlando', 'miami', 'nova york', 'new york', 'las vegas', 'los angeles', 'chicago', 'san francisco', 'boston', 'washington', 'disney'], 'US'],
  [['canada', 'canadá', 'toronto', 'vancouver', 'montreal', 'quebec'], 'CA'],
  [['reino unido', 'uk', 'england', 'inglaterra', 'london', 'londres', 'edinburgo', 'edinburgh'], 'GB'],
  [['espanha', 'spain', 'barcelona', 'madri', 'madrid', 'ibiza', 'mallorca', 'sevilha', 'sevilla', 'granada', 'valência', 'valencia'], 'ES'],
  [['portugal', 'lisboa', 'porto', 'algarve', 'açores', 'madeira', 'sintra'], 'PT'],
  [['franca', 'france', 'paris', 'nice', 'bordeaux', 'lyon', 'côte d\'azur', 'monte carlo', 'versailles'], 'FR'],
  [['italia', 'itália', 'italy', 'roma', 'rome', 'veneza', 'venice', 'florença', 'florence', 'milao', 'milão', 'milan', 'nápoles', 'naples', 'sicilia', 'sicília', 'amalfi', 'toscana', 'tuscany'], 'IT'],
  [['alemanha', 'germany', 'berlin', 'berlim', 'munique', 'munich', 'frankfurt', 'hamburgo'], 'DE'],
  [['holanda', 'netherlands', 'amsterdam', 'rotterdam'], 'NL'],
  [['belgica', 'bélgica', 'belgium', 'bruxelas', 'brussels', 'bruges'], 'BE'],
  [['suica', 'suíça', 'switzerland', 'zurique', 'zurich', 'genebra', 'geneva', 'interlaken', 'berna', 'bern', 'lucerna'], 'CH'],
  [['austria', 'áustria', 'viena', 'vienna', 'salzburgo', 'salzburg', 'innsbruck'], 'AT'],
  [['grecia', 'grécia', 'greece', 'atenas', 'athens', 'mykonos', 'santorini', 'rodes', 'rhodes', 'creta', 'crete', 'tessalonica'], 'GR'],
  [['turquia', 'turkey', 'istanbul', 'capadocia', 'capadócia', 'cappadocia', 'antalya', 'bodrum', 'izmir', 'efeso', 'ephesus'], 'TR'],
  [['emirados árabes', 'emirados arabes', 'uae', 'dubai', 'abu dhabi', 'abu dabi', 'sharjah'], 'AE'],
  [['egito', 'egypt', 'cairo', 'hurghada', 'sharm', 'luxor', 'assuã', 'assuan', 'aswan'], 'EG'],
  [['marrocos', 'morocco', 'marrakech', 'casablanca', 'fez', 'rabat'], 'MA'],
  [['africa do sul', 'áfrica do sul', 'south africa', 'cape town', 'cidade do cabo', 'joanesburgo', 'johannesburg', 'kruger', 'safari'], 'ZA'],
  [['japao', 'japão', 'japan', 'tokyo', 'tóquio', 'osaka', 'kyoto', 'hiroshima', 'nara'], 'JP'],
  [['china', 'pequim', 'beijing', 'xangai', 'shanghai'], 'CN'],
  [['coreia', 'korea', 'seoul', 'seul', 'busan', 'jeju'], 'KR'],
  [['tailandia', 'tailândia', 'thailand', 'bangkok', 'phuket', 'koh samui', 'chiang mai', 'chiang rai', 'krabi'], 'TH'],
  [['indonesia', 'indonésia', 'bali', 'lombok', 'jakarta', 'java', 'komodo'], 'ID'],
  [['filipinas', 'philippines', 'manila', 'palawan', 'boracay', 'cebu', 'bohol'], 'PH'],
  [['india', 'índia', 'nova deli', 'new delhi', 'mumbai', 'goa', 'agra', 'taj mahal', 'kerala', 'jaipur'], 'IN'],
  [['australia', 'austrália', 'sydney', 'melbourne', 'cairns', 'grande barreira', 'great barrier', 'brisbane', 'gold coast'], 'AU'],
  [['nova zelandia', 'nova zelândia', 'new zealand', 'auckland', 'queenstown', 'rotorua'], 'NZ'],
  [['cuba', 'havana', 'varadero', 'trinidad', 'santiago de cuba'], 'CU'],
  [['republica dominicana', 'república dominicana', 'punta cana', 'la romana', 'bavaro', 'bávaro', 'santo domingo'], 'DO'],
  [['panama', 'panamá', 'cidade do panama'], 'PA'],
  [['costa rica', 'san jose', 'são josé'], 'CR'],
  [['israel', 'tel aviv', 'jerusalem', 'jerusalém', 'terra santa', 'nazareth', 'nazaré'], 'IL'],
  [['jordania', 'jordânia', 'petra', 'amman', 'wadi rum', 'mar morto', 'dead sea'], 'JO'],
  [['croacia', 'croácia', 'croatia', 'dubrovnik', 'split', 'zagreb', 'istria', 'ístria', 'hvar'], 'HR'],
  [['hungria', 'hungary', 'budapest'], 'HU'],
  [['polonia', 'polônia', 'poland', 'cracow', 'cracovia', 'varsóvia', 'warsaw'], 'PL'],
  [['republica tcheca', 'república tcheca', 'czech', 'praga', 'prague', 'brno'], 'CZ'],
  [['singapura', 'singapore'], 'SG'],
  [['malasia', 'malásia', 'malaysia', 'kuala lumpur', 'kl', 'langkawi', 'penang'], 'MY'],
  [['vietna', 'vietnã', 'vietnam', 'hanoi', 'ho chi minh', 'hoi an', 'halong', 'danang'], 'VN'],
  [['maldivas', 'maldives'], 'MV'],
  [['sri lanka', 'colombo', 'kandy'], 'LK'],
  [['nepal', 'kathmandu', 'katmandu', 'everest', 'pokhara'], 'NP'],
  [['noruega', 'norway', 'oslo', 'bergen', 'fiordos', 'fjords', 'tromso', 'tromsø'], 'NO'],
  [['suecia', 'suécia', 'sweden', 'estocolmo', 'stockholm', 'gotemburgo', 'gothenburg'], 'SE'],
  [['dinamarca', 'denmark', 'copenhague', 'copenhagen'], 'DK'],
  [['finlandia', 'finlândia', 'finland', 'helsinki', 'laponia', 'lapônia', 'lapland', 'rovaniemi'], 'FI'],
  [['russia', 'rússia', 'moscou', 'moscow', 'são petersburgo', 'saint petersburg'], 'RU'],
  [['irlanda', 'ireland', 'dublin', 'galway', 'cork'], 'IE'],
  [['monaco', 'mônaco'], 'MC'],
  [['kenya', 'quênia', 'nairobi', 'masai mara', 'amboseli', 'mombasa'], 'KE'],
  [['tanzania', 'tanzânia', 'serengeti', 'zanzibar', 'kilimanjaro', 'dar es salaam'], 'TZ'],
  [['bahamas', 'nassau', 'paradise island'], 'BS'],
  [['jamaica', 'kingston', 'montego bay', 'negril', 'ocho rios'], 'JM'],
  [['aruba', 'oranjestad'], 'AW'],
  [['curacao', 'curaçao', 'willemstad'], 'CW'],
  [['barbados', 'bridgetown'], 'BB'],
  [['cambodja', 'camboja', 'cambodia', 'siem reap', 'angkor', 'phnom penh'], 'KH'],
  [['eslovenia', 'eslovênia', 'slovenia', 'liubliana', 'ljubjana', 'bled'], 'SI'],
  [['malta', 'valletta', 'valetta'], 'MT'],
  [['chipre', 'cyprus', 'nicosia', 'paphos'], 'CY'],
]

function detectFlag(text: string): string | null {
  if (!text.trim()) return null
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  for (const [keywords, iso] of COUNTRY_MAP) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize('NFD').replace(/\p{Diacritic}/gu, '')
      if (normalized.includes(kwNorm) || kwNorm.includes(normalized)) {
        return isoToFlag(iso)
      }
    }
  }
  return null
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
  const corridaEmpty = !corrida.destino.trim() && corrida.premiacao.length === 0 && !corrida.regras.trim() && !corrida.lamina_url
  const corridaFlag = detectFlag(corrida.destino)

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
                    {corridaFlag && <span className="text-2xl leading-none">{corridaFlag}</span>}
                    {corrida.destino}
                  </span>
                )}
              </div>

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
