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

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof Clock; className: string }> = {
  proxima:      { label: 'Próxima',      icon: Clock,        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  em_andamento: { label: 'Em andamento', icon: PlayCircle,   className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
  finalizada:   { label: 'Finalizada',   icon: CheckCircle2, className: 'bg-muted text-muted-foreground border-border' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptySection(): PremiacaoSection { return { titulo: '', itens: [] } }
function emptyItem(): PremiacaoItem { return { texto: '', especificacoes: '' } }

function emptyCorida(): CorridaData {
  return { status: 'proxima', tipo: 'nacional', titulo: '', descricao: '', destino: '', premiacoes: [emptySection()], regras: '', lamina_url: '' }
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
  return emptyItem()
}

function parseSection(raw: unknown): PremiacaoSection {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      titulo: typeof r.titulo === 'string' ? r.titulo : '',
      itens: Array.isArray(r.itens) ? r.itens.map(parseItem) : [],
    }
  }
  return emptySection()
}

function parseSingle(p: Record<string, unknown>): CorridaData {
  const statusRaw = p.status as string
  const status: Status = ['proxima', 'em_andamento', 'finalizada'].includes(statusRaw)
    ? (statusRaw as Status)
    : 'em_andamento'

  // Migração do formato antigo (premiacao_titulo + premiacao[])
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
    setOpenSet((prev) => prev.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i)))
  }

  function updateAt(idx: number, patch: Partial<CorridaData>) {
    setList((l) => l.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  // ── Premiação section helpers ─────────────────────────────────────────────

  function addSection(cIdx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx ? { ...item, premiacoes: [...item.premiacoes, emptySection()] } : item,
      ),
    )
  }

  function removeSection(cIdx: number, sIdx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx ? { ...item, premiacoes: item.premiacoes.filter((_, j) => j !== sIdx) } : item,
      ),
    )
  }

  function updateSection(cIdx: number, sIdx: number, patch: Partial<PremiacaoSection>) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx
          ? { ...item, premiacoes: item.premiacoes.map((s, j) => (j === sIdx ? { ...s, ...patch } : s)) }
          : item,
      ),
    )
  }

  // ── Premiação item helpers ────────────────────────────────────────────────

  function addItem(cIdx: number, sIdx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx
          ? {
              ...item,
              premiacoes: item.premiacoes.map((s, j) =>
                j === sIdx ? { ...s, itens: [...s.itens, emptyItem()] } : s,
              ),
            }
          : item,
      ),
    )
  }

  function updateItem(cIdx: number, sIdx: number, pIdx: number, field: keyof PremiacaoItem, value: string) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx
          ? {
              ...item,
              premiacoes: item.premiacoes.map((s, j) =>
                j === sIdx
                  ? { ...s, itens: s.itens.map((p, k) => (k === pIdx ? { ...p, [field]: value } : p)) }
                  : s,
              ),
            }
          : item,
      ),
    )
  }

  function removeItem(cIdx: number, sIdx: number, pIdx: number) {
    setList((l) =>
      l.map((item, i) =>
        i === cIdx
          ? {
              ...item,
              premiacoes: item.premiacoes.map((s, j) =>
                j === sIdx ? { ...s, itens: s.itens.filter((_, k) => k !== pIdx) } : s,
              ),
            }
          : item,
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
          {list.length === 0
            ? 'Nenhuma corrida cadastrada.'
            : `${list.length} corrida${list.length > 1 ? 's' : ''} cadastrada${list.length > 1 ? 's' : ''}.`}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addCorrida} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Nova corrida
        </Button>
      </div>

      {/* Lista de corridas */}
      {list.map((corrida, cIdx) => {
        const isOpen = openSet.includes(cIdx)
        const iso = detectIso(corrida.destino)
        const sc = STATUS_CONFIG[corrida.status]
        const StatusIcon = sc.icon

        return (
          <div key={cIdx} className="bg-card border rounded-xl overflow-hidden">
            {/* Cabeçalho do accordion */}
            <div className="flex items-center gap-2 p-4">
              <button
                type="button"
                onClick={() => toggleOpen(cIdx)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', sc.className)}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </span>
                <span className="font-medium text-foreground truncate">
                  {corrida.titulo || `Corrida ${cIdx + 1}`}
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
                onClick={() => removeCorrida(cIdx)}
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
                          onClick={() => updateAt(cIdx, { status: s })}
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
                          onClick={() => updateAt(cIdx, { tipo })}
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
                    onChange={(e) => updateAt(cIdx, { titulo: e.target.value })}
                    placeholder="Ex: Corrida de Vendas — Julho 2026"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Descrição</Label>
                  <RichTextEditor
                    content={corrida.descricao}
                    onChange={(html) => updateAt(cIdx, { descricao: html })}
                  />
                </div>

                {/* Produto / Destino */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Produto / Destino</Label>
                  <div className="relative">
                    <Input
                      value={corrida.destino}
                      onChange={(e) => updateAt(cIdx, { destino: e.target.value })}
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

                {/* Seções de Premiação */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <Label className="text-xs text-muted-foreground font-medium">Premiação</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSection(cIdx)}
                      className="gap-1.5 h-7 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Nova seção
                    </Button>
                  </div>

                  {corrida.premiacoes.map((section, sIdx) => (
                    <div key={sIdx} className="border border-border rounded-lg overflow-hidden">
                      {/* Cabeçalho da seção */}
                      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 border-b">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <input
                          type="text"
                          value={section.titulo}
                          onChange={(e) => updateSection(cIdx, sIdx, { titulo: e.target.value })}
                          placeholder={`Título da seção ${sIdx + 1} — ex: Prêmio para o 1º lugar`}
                          className="flex-1 min-w-0 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                        />
                        {corrida.premiacoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(cIdx, sIdx)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Remover seção"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Itens da seção */}
                      <div className="p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          O ícone é detectado automaticamente pelo nome — ex: "Hotel", "Transfer", "Voo".
                        </p>

                        {section.itens.map((item, pIdx) => {
                          const Icon = detectPremiacaoIcon(item.texto)
                          return (
                            <div key={pIdx} className="border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                                  <Icon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <Input
                                  value={item.texto}
                                  onChange={(e) => updateItem(cIdx, sIdx, pIdx, 'texto', e.target.value)}
                                  placeholder="Ex: Transfer In/Out, Hotel 5 noites, Voo…"
                                  className="flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeItem(cIdx, sIdx, pIdx)}
                                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <Textarea
                                value={item.especificacoes}
                                onChange={(e) => updateItem(cIdx, sIdx, pIdx, 'especificacoes', e.target.value)}
                                placeholder="Especificações (opcional) — ex: check-in 14h, café incluído, 2 pax..."
                                className="min-h-[60px] text-xs resize-none ml-9"
                                rows={2}
                              />
                            </div>
                          )
                        })}

                        {section.itens.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nenhum item adicionado ainda.</p>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(cIdx, sIdx)}
                          className="gap-1.5 h-7 text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar item
                        </Button>
                      </div>
                    </div>
                  ))}
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
                      onClick={() => clickUpload(cIdx)}
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
                          onClick={() => updateAt(cIdx, { lamina_url: '' })}
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
                    onChange={(html) => updateAt(cIdx, { regras: html })}
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
