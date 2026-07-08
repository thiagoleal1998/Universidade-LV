'use client'

import { useState, useTransition } from 'react'
import { saveCorridaVendas } from '@/app/actions/marketing-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Trophy, Globe, MapPin, Plus, X, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

type CorridaData = {
  tipo: 'nacional' | 'internacional'
  premiacao: string[]
  regras: string
}

function parse(raw: string): CorridaData {
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

export function CorridaVendasManager({ raw }: { raw: string }) {
  const [data, setData] = useState<CorridaData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()

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
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar corrida de vendas'}
        </Button>
      </div>
    </form>
  )
}
