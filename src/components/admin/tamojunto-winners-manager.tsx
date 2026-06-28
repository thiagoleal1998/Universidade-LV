'use client'

import { useState, useTransition } from 'react'
import { saveTamojuntoWinners } from '@/app/actions/marketing-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trophy, Medal } from 'lucide-react'

type Region = { name: string; agency1: string; agency2: string }

type WinnersData = {
  active: boolean
  title: string
  badge: string
  month: string
  regions: Region[]
}

const DEFAULT_REGIONS: Region[] = [
  { name: 'Norte', agency1: '', agency2: '' },
  { name: 'Nordeste', agency1: '', agency2: '' },
  { name: 'Centro-Oeste', agency1: '', agency2: '' },
  { name: 'Sudeste', agency1: '', agency2: '' },
  { name: 'Sul', agency1: '', agency2: '' },
]

function parse(raw: string): WinnersData {
  try {
    const p = JSON.parse(raw)
    return {
      active: p.active ?? false,
      title: p.title ?? 'Vencedores do Mês',
      badge: p.badge ?? 'TamoJunto LV',
      month: p.month ?? '',
      regions: Array.isArray(p.regions) && p.regions.length === 5
        ? p.regions
        : DEFAULT_REGIONS,
    }
  } catch {
    return { active: false, title: 'Vencedores do Mês', badge: 'TamoJunto LV', month: '', regions: DEFAULT_REGIONS }
  }
}

export function TamoJuntoWinnersManager({ raw }: { raw: string }) {
  const [data, setData] = useState<WinnersData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()

  function updateRegion(idx: number, field: keyof Region, value: string) {
    setData((prev) => {
      const regions = prev.regions.map((r, i) => i === idx ? { ...r, [field]: value } : r)
      return { ...prev, regions }
    })
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
        <p className="text-xs text-muted-foreground -mt-3">Deixe em branco as regiões sem vencedores — elas não serão exibidas.</p>
        {data.regions.map((region, idx) => (
          <div key={region.name} className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{region.name}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="text-yellow-500">🥇</span> 1ª Agência
                </Label>
                <Input
                  className="mt-1"
                  value={region.agency1}
                  onChange={(e) => updateRegion(idx, 'agency1', e.target.value)}
                  placeholder="Nome da agência"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="text-gray-400">🥈</span> 2ª Agência
                </Label>
                <Input
                  className="mt-1"
                  value={region.agency2}
                  onChange={(e) => updateRegion(idx, 'agency2', e.target.value)}
                  placeholder="Nome da agência"
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
