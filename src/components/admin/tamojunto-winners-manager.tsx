'use client'

import { useState, useTransition } from 'react'
import { saveTamojuntoWinners } from '@/app/actions/marketing-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trophy, Medal, Plus, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Region = {
  name: string
  agency1: string
  value1: string
  agency2: string
  value2: string
}

type MonthEntry = {
  month: string
  regions: Region[]
}

type WinnersData = {
  active: boolean
  title: string
  badge: string
  months: MonthEntry[]
}

const DEFAULT_REGIONS: Region[] = [
  { name: 'Norte',        agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Nordeste',     agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Centro-Oeste', agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Sudeste',      agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Sul',          agency1: '', value1: '', agency2: '', value2: '' },
]

function emptyMonth(): MonthEntry {
  return { month: '', regions: DEFAULT_REGIONS.map((r) => ({ ...r })) }
}

function parseRegions(raw: unknown): Region[] {
  const arr = Array.isArray(raw) ? raw : []
  return DEFAULT_REGIONS.map((def, i) => {
    const r = arr[i] as Partial<Region> | undefined
    return {
      name: typeof r?.name === 'string' && r.name ? r.name : def.name,
      agency1: typeof r?.agency1 === 'string' ? r.agency1 : '',
      value1: typeof r?.value1 === 'string' ? r.value1 : '',
      agency2: typeof r?.agency2 === 'string' ? r.agency2 : '',
      value2: typeof r?.value2 === 'string' ? r.value2 : '',
    }
  })
}

function parse(raw: string): WinnersData {
  try {
    const p = JSON.parse(raw)
    const active = p.active ?? false
    const title = p.title ?? 'Vencedores do Mês'
    const badge = p.badge ?? 'TamoJunto LV'

    if (Array.isArray(p.months) && p.months.length > 0) {
      return {
        active, title, badge,
        months: p.months.map((m: Partial<MonthEntry>) => ({
          month: typeof m.month === 'string' ? m.month : '',
          regions: parseRegions(m.regions),
        })),
      }
    }

    // Formato legado: um único mês salvo direto na raiz (antes de suportar várias sessões)
    if (typeof p.month === 'string' || Array.isArray(p.regions)) {
      return { active, title, badge, months: [{ month: p.month ?? '', regions: parseRegions(p.regions) }] }
    }

    return { active, title, badge, months: [emptyMonth()] }
  } catch {
    return { active: false, title: 'Vencedores do Mês', badge: 'TamoJunto LV', months: [emptyMonth()] }
  }
}

export function TamoJuntoWinnersManager({ raw }: { raw: string }) {
  const [data, setData] = useState<WinnersData>(() => parse(raw))
  const [openSet, setOpenSet] = useState<number[]>(() => (parse(raw).months.length === 1 ? [0] : []))
  const [isPending, startTransition] = useTransition()

  function toggleOpen(idx: number) {
    setOpenSet((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx])
  }

  function addMonth() {
    setData((d) => ({ ...d, months: [emptyMonth(), ...d.months] }))
    setOpenSet((prev) => [0, ...prev.map((i) => i + 1)])
  }

  function removeMonth(idx: number) {
    setData((d) => ({ ...d, months: d.months.filter((_, i) => i !== idx) }))
    setOpenSet((prev) => prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)))
  }

  function updateMonthLabel(mIdx: number, value: string) {
    setData((d) => ({ ...d, months: d.months.map((m, i) => i === mIdx ? { ...m, month: value } : m) }))
  }

  function updateRegion(mIdx: number, rIdx: number, field: keyof Region, value: string) {
    setData((d) => ({
      ...d,
      months: d.months.map((m, i) => i === mIdx ? {
        ...m,
        regions: m.regions.map((r, j) => j === rIdx ? { ...r, [field]: value } : r),
      } : m),
    }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('tamojunto_winners', JSON.stringify(data))
    startTransition(async () => {
      const r = await saveTamojuntoWinners(fd)
      if (r?.error) toast.error(r.error)
      else toast.success('Premiação salva!')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Ativar */}
      <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Exibir seção na home</p>
          <p className="text-xs text-muted-foreground mt-0.5">Quando ativo, a seção de vencedores aparece na página inicial dos membros.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.active}
          onClick={() => setData((d) => ({ ...d, active: !d.active }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${data.active ? 'bg-primary' : 'bg-input'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${data.active ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Cabeçalho da seção</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input
              className="mt-1"
              value={data.title}
              onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
              placeholder="Vencedores do Mês"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Badge / Etiqueta</Label>
            <Input
              className="mt-1"
              value={data.badge}
              onChange={(e) => setData((d) => ({ ...d, badge: e.target.value }))}
              placeholder="TamoJunto LV"
            />
          </div>
        </div>
      </div>

      {/* Sessões por mês */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.months.length === 0
              ? 'Nenhum mês cadastrado.'
              : `${data.months.length} mês${data.months.length > 1 ? 'es' : ''} cadastrado${data.months.length > 1 ? 's' : ''}.`}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addMonth} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Nova sessão
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          O primeiro mês da lista é o exibido na home. Adicione uma nova sessão para o próximo mês sem apagar o anterior.
        </p>

        {data.months.map((entry, mIdx) => {
          const isOpen = openSet.includes(mIdx)
          return (
            <div key={mIdx} className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-4">
                <button type="button" onClick={() => toggleOpen(mIdx)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                  {mIdx === 0 && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Atual
                    </span>
                  )}
                  <span className="font-medium text-foreground truncate">{entry.month || `Sessão ${mIdx + 1}`}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform ml-auto', isOpen && 'rotate-180')} />
                </button>
                <button type="button" onClick={() => removeMonth(mIdx)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors" title="Remover sessão">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {isOpen && (
                <div className="border-t px-5 py-5 space-y-5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mês de referência</Label>
                    <Input
                      className="mt-1"
                      value={entry.month}
                      onChange={(e) => updateMonthLabel(mIdx, e.target.value)}
                      placeholder="Junho 2026"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Agências vencedoras por região</h4>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-3">Deixe em branco as posições sem vencedor — elas não serão exibidas.</p>

                  {entry.regions.map((region, rIdx) => (
                    <div key={region.name} className="border border-border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{region.name}</p>

                      {/* 1ª Agência */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="text-yellow-500">🥇</span> 1ª Agência
                        </Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            value={region.agency1}
                            onChange={(e) => updateRegion(mIdx, rIdx, 'agency1', e.target.value)}
                            placeholder="Nome da agência"
                          />
                          <Input
                            value={region.value1}
                            onChange={(e) => updateRegion(mIdx, rIdx, 'value1', e.target.value)}
                            placeholder="Valor do prêmio (ex: R$ 500)"
                          />
                        </div>
                      </div>

                      {/* 2ª Agência */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="text-slate-400">🥈</span> 2ª Agência
                        </Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            value={region.agency2}
                            onChange={(e) => updateRegion(mIdx, rIdx, 'agency2', e.target.value)}
                            placeholder="Nome da agência"
                          />
                          <Input
                            value={region.value2}
                            onChange={(e) => updateRegion(mIdx, rIdx, 'value2', e.target.value)}
                            placeholder="Valor do prêmio (ex: R$ 250)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar premiação'}
        </Button>
      </div>
    </form>
  )
}
