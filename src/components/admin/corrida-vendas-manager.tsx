'use client'

import { useState, useTransition, useRef } from 'react'
import { saveCorridaVendas } from '@/app/actions/marketing-settings'
import { uploadMarketingFile } from '@/app/actions/marketing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Trophy, Globe, MapPin, Plus, X, ScrollText, Paperclip, Upload,
  ExternalLink, Loader2, ChevronDown, Trash2, Clock, PlayCircle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { detectPremiacaoIcon } from '@/lib/premiacao-icons'

// ── Tipos ────────────────────────────────────────────────────────────────────

type Status = 'proxima' | 'em_andamento' | 'finalizada'
type PremiacaoItem = { texto: string; especificacoes: string }

type CorridaData = {
  status: Status
  tipo: 'nacional' | 'internacional'
  titulo: string
  descricao: string
  destino: string
  premiacao_titulo: string
  premiacao: PremiacaoItem[]
  regras: string
  lamina_url: string
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof Clock; className: string }> = {
  proxima:      { label: 'Próxima',      icon: Clock,         className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  em_andamento: { label: 'Em andamento', icon: PlayCircle,    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  finalizada:   { label: 'Finalizada',   icon: CheckCircle2,  className: 'bg-muted text-muted-foreground border-border' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyCorida(): CorridaData {
  return { status: 'proxima', tipo: 'nacional', titulo: '', descricao: '', destino: '', premiacao_titulo: '', premiacao: [], regras: '', lamina_url: '' }
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

function parseSingle(p: Record<string, unknown>): CorridaData {
  const statusRaw = p.status as string
  const status: Status = ['proxima', 'em_andamento', 'finalizada'].includes(statusRaw)
    ? (statusRaw as Status)
    : 'em_andamento'
  return {
    status,
    tipo: p.tipo === 'internacional' ? 'internacional' : 'nacional',
    titulo: typeof p.titulo === 'string' ? p.titulo : '',
    descricao: typeof p.descricao === 'string' ? p.descricao : '',
    destino: typeof p.destino === 'string' ? p.destino : '',
    premiacao_titulo: typeof p.premiacao_titulo === 'string' ? p.premiacao_titulo : '',
    premiacao: Array.isArray(p.premiacao) ? p.premiacao.map(parseItem) : [],
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

// ── Componente ───────────────────────────────────────────────────────────────

export function CorridaVendasManager({ raw }: { raw: string }) {
  const [list, setList] = useState<CorridaData[]>(() => parseList(raw))
  const [openSet, setOpenSet] = useState<number[]>(() => (parseList(raw).length === 1 ? [0] : []))
  const [isPending, startTransition] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const pendingUploadIdx = useRef<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── List helpers ──────────────────────────────────────────────────────────

  function toggleOpen(idx: number) {
    setOpenSet((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx])
  }

  function addCorrida() {
    const nextIdx = list.length
    setList((l) => [...l, emptyCorida()])
    setOpenSet((prev) => [...prev, nextIdx])
  }

  function removeCorrida(idx: number) {
    setList((l) => l.filter((_, i) => i !== idx))
    setOpenSet((prev) =>
      prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)),
    )
  }

  function updateAt(idx: number, patch: Partial<CorridaData>) {
    setList((l) => l.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  // ── Premiação helpers ─────────────────────────────────────────────────────

  function addPremiacaoItem(idx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === idx ? { ...item, premiacao: [...item.premiacao, { texto: '', especificacoes: '' }] } : item,
      ),
    )
  }

  function updatePremiacaoItem(cIdx: number, pIdx: number, field: keyof PremiacaoItem, value: string) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx
          ? { ...item, premiacao: item.premiacao.map((p, j) => (j === pIdx ? { ...p, [field]: value } : p)) }
          : item,
      ),
    )
  }

  function removePremiacaoItem(cIdx: number, pIdx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx ? { ...item, premiacao: item.premiacao.filter((_, j) => j !== pIdx) } : item,
      ),
    )
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  function clickUpload(idx: number) {
    pendingUploadIdx.current = idx
    fileRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const idx = pendingUploadIdx.current
    if (!file || idx === null) return
    e.target.value = ''
    startUpload(async () => {
      const r = await uploadMarketingFile(file)
      if (r?.error) toast.error(r.error)
      else if (r.url) { updateAt(idx, { lamina_url: r.url }); toast.success('Lâmina enviada!') }
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('corrida_vendas', JSON.stringify(list))
    startTransition(async () => {
      const r = await saveCorridaVendas(fd)
      if (r?.error) toast.error(r.error)
      else toast.success('Corridas de vendas salvas!')
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mt-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.length === 0 ? 'Nenhuma corrida cadastrada.' : `${list.length} corrida${list.length > 1 ? 's' : ''} cadastrada${list.length > 1 ? 's' : ''}.`}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addCorrida} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Nova corrida
        </Button>
      </div>

      {/* Lista de corridas */}
      {list.map((corrida, idx) => {
        const isOpen = openSet.includes(idx)
        const iso = detectIso(corrida.destino)
        const sc = STATUS_CONFIG[corrida.status]
        const StatusIcon = sc.icon

        return (
          <div key={idx} className="bg-card border rounded-xl overflow-hidden">
            {/* Cabeçalho do accordion */}
            <div className="flex items-center gap-2 p-4">
              <button
                type="button"
                onClick={() => toggleOpen(idx)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', sc.className)}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </span>
                <span className="font-medium text-foreground truncate">
                  {corrida.titulo || `Corrida ${idx + 1}`}
                </span>
                {corrida.destino && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                    {corrida.destino}
                  </span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform ml-auto', isOpen && 'rotate-180')} />
              </button>
              <button
                type="button"
                onClick={() => removeCorrida(idx)}
                className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Remover corrida"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="border-t px-5 py-5 space-y-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">Status</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => {
                      const { label, icon: Icon, className: cls } = STATUS_CONFIG[s]
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateAt(idx, { status: s })}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                            corrida.status === s ? cls : 'bg-transparent text-muted-foreground border-border hover:border-primary/40',
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">Tipo de corrida</Label>
                  <div className="flex gap-2">
                    {(['nacional', 'internacional'] as const).map((tipo) => {
                      const Icon = tipo === 'nacional' ? MapPin : Globe
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => updateAt(idx, { tipo })}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                            corrida.tipo === tipo
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-transparent text-muted-foreground border-border hover:border-primary/50',
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {tipo === 'nacional' ? 'Nacional' : 'Internacional'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Título */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Título da corrida</Label>
                  <Input
                    value={corrida.titulo}
                    onChange={(e) => updateAt(idx, { titulo: e.target.value })}
                    placeholder="Ex: Corrida de Vendas — Julho 2026"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Descrição</Label>
                  <RichTextEditor
                    content={corrida.descricao}
                    onChange={(html) => updateAt(idx, { descricao: html })}
                  />
                </div>

                {/* Produto / Destino */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">
                    Produto / Destino
                  </Label>
                  <div className="relative">
                    <Input
                      value={corrida.destino}
                      onChange={(e) => updateAt(idx, { destino: e.target.value })}
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

                {/* Premiação */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <Label className="text-xs text-muted-foreground font-medium">Premiação</Label>
                  </div>

                  <Input
                    value={corrida.premiacao_titulo}
                    onChange={(e) => updateAt(idx, { premiacao_titulo: e.target.value })}
                    placeholder="Título da premiação — ex: Prêmio para o 1º lugar"
                  />

                  <p className="text-xs text-muted-foreground">
                    O ícone é detectado automaticamente pelo nome — ex: "Hotel", "Transfer", "Voo".
                  </p>

                  <div className="space-y-2">
                    {corrida.premiacao.map((item, pIdx) => {
                      const Icon = detectPremiacaoIcon(item.texto)
                      return (
                        <div key={pIdx} className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <Input
                              value={item.texto}
                              onChange={(e) => updatePremiacaoItem(idx, pIdx, 'texto', e.target.value)}
                              placeholder="Ex: Transfer In/Out, Hotel 5 noites, Voo…"
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => removePremiacaoItem(idx, pIdx)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <Textarea
                            value={item.especificacoes}
                            onChange={(e) => updatePremiacaoItem(idx, pIdx, 'especificacoes', e.target.value)}
                            placeholder="Especificações (opcional) — ex: check-in 14h, café incluído, 2 pax..."
                            className="min-h-[60px] text-xs resize-none ml-9"
                            rows={2}
                          />
                        </div>
                      )
                    })}
                    {corrida.premiacao.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nenhum item adicionado ainda.</p>
                    )}
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={() => addPremiacaoItem(idx)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar item
                  </Button>
                </div>

                {/* Lâmina */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <Label className="text-xs text-muted-foreground font-medium">Lâmina (PDF ou imagem)</Label>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => clickUpload(idx)}
                      disabled={isUploading}
                      className="gap-1.5"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {corrida.lamina_url ? 'Trocar arquivo' : 'Anexar arquivo'}
                    </Button>
                    {corrida.lamina_url && (
                      <>
                        <a
                          href={corrida.lamina_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver arquivo atual
                        </a>
                        <button
                          type="button"
                          onClick={() => updateAt(idx, { lamina_url: '' })}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Regras */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <Label className="text-xs text-muted-foreground font-medium">Regras</Label>
                  </div>
                  <RichTextEditor
                    content={corrida.regras}
                    onChange={(html) => updateAt(idx, { regras: html })}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Upload oculto compartilhado */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {list.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending || isUploading}>
            {isPending ? 'Salvando...' : 'Salvar corridas de vendas'}
          </Button>
        </div>
      )}
    </form>
  )
}
