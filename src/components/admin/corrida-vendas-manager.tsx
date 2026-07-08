'use client'

import { useState, useTransition, useRef } from 'react'
import { saveCorridaVendas } from '@/app/actions/marketing-settings'
import { uploadMarketingFile } from '@/app/actions/marketing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trophy, Globe, MapPin, Plus, X, ScrollText, Paperclip, Upload, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { RichTextEditor } from '@/components/admin/rich-text-editor'

type CorridaData = {
  tipo: 'nacional' | 'internacional'
  titulo: string
  descricao: string
  destino: string
  premiacao_titulo: string
  premiacao: string[]
  regras: string
  lamina_url: string
}

function parse(raw: string): CorridaData {
  try {
    const p = JSON.parse(raw)
    return {
      tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
      titulo: typeof p.titulo === 'string' ? p.titulo : '',
      descricao: typeof p.descricao === 'string' ? p.descricao : '',
      destino: typeof p.destino === 'string' ? p.destino : '',
      premiacao_titulo: typeof p.premiacao_titulo === 'string' ? p.premiacao_titulo : '',
      premiacao: Array.isArray(p.premiacao) ? p.premiacao : [],
      regras: typeof p.regras === 'string' ? p.regras : '',
      lamina_url: typeof p.lamina_url === 'string' ? p.lamina_url : '',
    }
  } catch {
    return { tipo: 'nacional', titulo: '', descricao: '', destino: '', premiacao_titulo: '', premiacao: [], regras: '', lamina_url: '' }
  }
}

export function CorridaVendasManager({ raw }: { raw: string }) {
  const [data, setData] = useState<CorridaData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const iso = detectIso(data.destino)

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

      {/* Título */}
      <div className="bg-card border rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Título da corrida</h3>
        </div>
        <Input
          value={data.titulo}
          onChange={(e) => setData((d) => ({ ...d, titulo: e.target.value }))}
          placeholder="Ex: Corrida de Vendas — Julho 2026"
        />
      </div>

      {/* Descrição */}
      <div className="bg-card border rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Descrição</h3>
        </div>
        <RichTextEditor
          content={data.descricao}
          onChange={(html) => setData((d) => ({ ...d, descricao: html }))}
        />
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
              className={iso ? 'pr-14' : ''}
            />
            {iso && (
              <img
                src={flagImgUrl(iso, '32x24')}
                srcSet={`${flagImgUrl(iso, '48x36')} 2x`}
                width={32}
                height={24}
                alt="Bandeira"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm object-cover pointer-events-none"
              />
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
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Título da premiação</Label>
          <Input
            value={data.premiacao_titulo}
            onChange={(e) => setData((d) => ({ ...d, premiacao_titulo: e.target.value }))}
            placeholder="Ex: Prêmio para o 1º lugar"
          />
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
        <RichTextEditor
          content={data.regras}
          onChange={(html) => setData((d) => ({ ...d, regras: html }))}
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
