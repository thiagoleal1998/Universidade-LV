'use client'

import { useState, useTransition } from 'react'
import { saveTamojuntoWinners } from '@/app/actions/marketing-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trophy, Medal } from 'lucide-react'

type Region = {
  name: string
  agency1: string
  value1: string
  agency2: string
  value2: string
}

type WinnersData = {
  active: boolean
  title: string
  badge: string
  month: string
  regions: Region[]
}

const DEFAULT_REGIONS: Region[] = [
  { name: 'Norte',        agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Nordeste',     agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Centro-Oeste', agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Sudeste',      agency1: '', value1: '', agency2: '', value2: '' },
  { name: 'Sul',          agency1: '', value1: '', agency2: '', value2: '' },
]

function parse(raw: string): WinnersData {
  try {
    const p = JSON.parse(raw)
    const regions: Region[] = Array.isArray(p.regions) && p.regions.length === 5
      ? p.regions.map((r: Partial<Region>, i: number) => ({
          name:    r.name    ?? DEFAULT_REGIONS[i].name,
          agency1: r.agency1 ?? '',
          value1:  r.value1  ?? '',
          agency2: r.agency2 ?? '',
          value2:  r.value2  ?? '',
        }))
      : DEFAULT_REGIONS
    return {
      active: p.active ?? false,
      title:  p.title  ?? 'Vencedores do Mês',
      badge:  p.badge  ?? 'TamoJunto LV',
      month:  p.month  ?? '',
      regions,
    }
  } catch {
    return { active: false, title: 'Vencedores do Mês', badge: 'TamoJunto LV', month: '', regions: DEFAULT_REGIONS }
  }
}

export function TamoJuntoWinnersManager({ raw }: { raw: string }) {
  const [data, setData] = useState<WinnersData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()

  function updateRegion(idx: number, field: keyof Region, value: string) {
    setData((prev) => ({
      ...prev,
      regions: prev.regions.map((r, i) => i === idx ? { ...r, [field]: value } : r),
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
        <div className="grid gap-4 sm:grid-cols-3">
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
          <div>
            <Label className="text-xs text-muted-foreground">Mês de referência</Label>
            <Input
              className="mt-1"
              value={data.month}
              onChange={(e) => setData((d) => ({ ...d, month: e.target.value }))}
              placeholder="Junho 2026"
            />
          </div>
        </div>
      </div>

      {/* Regiões */}
      <div className="bg-card border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Medal className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Agências vencedoras por região</h3>
        </div>
        <p className="text-xs text-muted-foreground">Deixe em branco as regiões sem vencedores — elas não serão exibidas.</p>

        {data.regions.map((region, idx) => (
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
                  onChange={(e) => updateRegion(idx, 'agency1', e.target.value)}
                  placeholder="Nome da agência"
                />
                <Input
                  value={region.value1}
                  onChange={(e) => updateRegion(idx, 'value1', e.target.value)}
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
                  onChange={(e) => updateRegion(idx, 'agency2', e.target.value)}
                  placeholder="Nome da agência"
                />
                <Input
                  value={region.value2}
                  onChange={(e) => updateRegion(idx, 'value2', e.target.value)}
                  placeholder="Valor do prêmio (ex: R$ 250)"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar premiação'}
        </Button>
      </div>
    </form>
  )
}
