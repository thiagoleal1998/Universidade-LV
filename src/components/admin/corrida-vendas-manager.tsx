'use client'

import { useState, useTransition, useRef } from 'react'
import { saveCorridaVendas } from '@/app/actions/marketing-settings'
import { uploadMarketingFile } from '@/app/actions/marketing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trophy, Globe, MapPin, Plus, X, ScrollText, Paperclip, Upload, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ISO 2-letter code → flag emoji
function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

// Keywords → ISO code (PT-BR focus, with cities/resorts)
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
  [['albania', 'albânia', 'tirana'], 'AL'],
  [['malta', 'valletta', 'valetta'], 'MT'],
  [['chipre', 'cyprus', 'nicosia', 'paphos'], 'CY'],
  [['luxemburgo', 'luxembourg'], 'LU'],
  [['suedeia', 'suécia'], 'SE'],
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

type CorridaData = {
  tipo: 'nacional' | 'internacional'
  destino: string
  premiacao: string[]
  regras: string
  lamina_url: string
}

function parse(raw: string): CorridaData {
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

export function CorridaVendasManager({ raw }: { raw: string }) {
  const [data, setData] = useState<CorridaData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const flag = detectFlag(data.destino)

  function addItem() {
    setData((d) => ({ ...d, premiacao: [...d.premiacao, ''] }))
  }

  function updateItem(idx: number, value: string) {
    setData((d) => ({
      ...d,
      premiacao: d.premiacao.map((item, i) => (i === idx ? value : item)),
    }))
  }

  function removeItem(idx: number) {
    setData((d) => ({ ...d, premiacao: d.premiacao.filter((_, i) => i !== idx) }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startUpload(async () => {
      const r = await uploadMarketingFile(file)
      if (r?.error) toast.error(r.error)
      else if (r.url) { setData((d) => ({ ...d, lamina_url: r.url })); toast.success('Lâmina enviada!') }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('corrida_vendas', JSON.stringify(data))
    startTransition(async () => {
      const r = await saveCorridaVendas(fd)
      if (r?.error) toast.error(r.error)
      else toast.success('Corrida de vendas salva!')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mt-4">
      {/* Tipo de corrida */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Tipo de corrida</h3>
        </div>
        <div className="flex gap-2">
          {(['nacional', 'internacional'] as const).map((tipo) => {
            const Icon = tipo === 'nacional' ? MapPin : Globe
            const label = tipo === 'nacional' ? 'Nacional' : 'Internacional'
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setData((d) => ({ ...d, tipo }))}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  data.tipo === tipo
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/50',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Produto / Destino */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Produto / Destino</h3>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Nome do produto ou destino (se for um país ou cidade, a bandeira aparece automaticamente)
          </Label>
          <div className="relative">
            <Input
              value={data.destino}
              onChange={(e) => setData((d) => ({ ...d, destino: e.target.value }))}
              placeholder="Ex: Cancún, Maldivas, Cruzeiro Europa…"
              className={flag ? 'pr-12' : ''}
            />
            {flag && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl select-none leading-none">
                {flag}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Premiação */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-foreground">Premiação</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Adicione cada item do prêmio separadamente — ex: Transfer In/Out, Hotel, Passeio.
        </p>

        <div className="space-y-2">
          {data.premiacao.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{idx + 1}</span>
              </div>
              <Input
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                placeholder={`Item ${idx + 1} do prêmio`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {data.premiacao.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1">Nenhum item adicionado ainda.</p>
          )}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Adicionar item
        </Button>
      </div>

      {/* Lâmina */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Lâmina</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Anexe a lâmina da corrida de vendas (PDF ou imagem).
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {isUploading ? 'Enviando…' : data.lamina_url ? 'Trocar arquivo' : 'Anexar arquivo'}
          </Button>

          {data.lamina_url && (
            <>
              <a
                href={data.lamina_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver arquivo atual
              </a>
              <button
                type="button"
                onClick={() => setData((d) => ({ ...d, lamina_url: '' }))}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remover
              </button>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Regras */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Regras</h3>
        </div>
        <Textarea
          value={data.regras}
          onChange={(e) => setData((d) => ({ ...d, regras: e.target.value }))}
          placeholder="Descreva as regras da corrida de vendas..."
          className="min-h-[180px]"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || isUploading}>
          {isPending ? 'Salvando...' : 'Salvar corrida de vendas'}
        </Button>
      </div>
    </form>
  )
}
