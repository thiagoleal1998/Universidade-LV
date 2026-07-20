'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createTrainingItem, updateTrainingItem, deleteTrainingItem, uploadTrainingCover,
  createTrainingMaterial, deleteTrainingMaterial, toggleTrainingActive,
} from '@/app/actions/training'
import type { TrainingItem, TrainingMaterial } from '@/app/actions/training'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Plus, Pencil, Trash2, X, ExternalLink, GraduationCap, EyeOff,
  Upload, ImageIcon, Paperclip, ChevronDown, ChevronUp,
  FileText, Play, File, Link2, Eye, Radio, RotateCcw,
  CheckCircle2, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type TrainingType = 'link' | 'live' | 'replay'

// ─── helpers ───────────────────────────────────────────────────────────────

function formatBrazilDate(utcStr: string | null): string {
  if (!utcStr) return ''
  return new Date(utcStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function toLiveDateInput(utcStr: string | null): string {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  const brazil = new Date(d.getTime() - 3 * 3600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${brazil.getUTCFullYear()}-${p(brazil.getUTCMonth() + 1)}-${p(brazil.getUTCDate())}T${p(brazil.getUTCHours())}:${p(brazil.getUTCMinutes())}`
}

// ─── sub-components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: TrainingType }) {
  if (type === 'live') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
      <Radio className="w-2.5 h-2.5" /> Ao vivo
    </span>
  )
  if (type === 'replay') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
      <RotateCcw className="w-2.5 h-2.5" /> Replay
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <Link2 className="w-2.5 h-2.5" /> Link
    </span>
  )
}

function MaterialTypeIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
  if (type === 'video') return <Play className="w-3.5 h-3.5 text-blue-500 shrink-0" />
  if (type === 'doc') return <File className="w-3.5 h-3.5 text-sky-500 shrink-0" />
  return <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
}

function AddMaterialForm({ trainingId, onDone }: { trainingId: string; onDone: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createTrainingMaterial(trainingId, fd)
      if (result?.error) toast.error(result.error)
      else { toast.success('Material adicionado!'); onDone(); router.refresh() }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 bg-card rounded-xl border border-border p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input name="title" required placeholder="Nome do material" className="h-8 text-sm" />
        <select name="type" className="h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground">
          <option value="link">Link</option>
          <option value="pdf">PDF</option>
          <option value="video">Vídeo</option>
          <option value="doc">Documento</option>
        </select>
        <Input name="url" required type="url" placeholder="https://..." className="h-8 text-sm sm:col-span-2" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="gap-1.5 h-7 text-xs">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} className="h-7 text-xs">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function MaterialsList({ materials, onDelete, isPending, canEdit = true }: {
  materials: TrainingMaterial[]
  onDelete: (id: string) => void
  isPending: boolean
  canEdit?: boolean
}) {
  const sorted = [...materials].sort((a, b) => a.order_index - b.order_index)
  if (sorted.length === 0) return <p className="text-sm text-muted-foreground py-1">Nenhum material adicionado ainda.</p>
  return (
    <div className="space-y-1.5">
      {sorted.map((mat) => (
        <div key={mat.id} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
          <MaterialTypeIcon type={mat.type} />
          <span className="text-xs font-mono text-muted-foreground w-8 uppercase shrink-0">{mat.type}</span>
          <a href={mat.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-foreground hover:text-primary truncate font-medium">{mat.title}</a>
          {canEdit && (
            <button onClick={() => onDelete(mat.id)} disabled={isPending} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Preview modal ──────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }: { item: TrainingItem; onClose: () => void }) {
  const materials = (item.materials ?? []).sort((a, b) => a.order_index - b.order_index)
  const isLiveFuture = item.type === 'live' && item.live_at && new Date(item.live_at) > new Date()
  const isLivePast = item.type === 'live' && item.live_at && new Date(item.live_at) <= new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/80">Pré-visualização — como o aluno vê</p>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member card replica */}
        <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          {/* Cover */}
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden relative">
            {item.cover_url
              ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
              : <GraduationCap className="w-12 h-12 text-primary/40" />
            }
            {item.type !== 'link' && (
              <div className="absolute top-2 left-2">
                <TypeBadge type={item.type} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col p-4 gap-2">
            <p className="font-semibold text-foreground leading-snug">{item.title}</p>
            {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}

            {/* Live: date + countdown */}
            {item.type === 'live' && item.live_at && (
              <div className={cn('flex items-center gap-2 text-xs rounded-lg px-3 py-2 border',
                isLiveFuture ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'bg-muted border-border text-muted-foreground'
              )}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {isLiveFuture ? (
                  <span>{formatBrazilDate(item.live_at)}</span>
                ) : (
                  <span>Sessão encerrada</span>
                )}
              </div>
            )}

            {/* CTA */}
            <div className={cn('flex items-center gap-1.5 text-xs font-semibold mt-1',
              item.type === 'live' && isLivePast ? 'text-muted-foreground' : 'text-primary'
            )}>
              {item.type === 'live'
                ? isLiveFuture ? <><Radio className="w-3.5 h-3.5" /> Participar ao vivo</> : <><X className="w-3.5 h-3.5" /> Sessão encerrada</>
                : item.type === 'replay'
                  ? <><Play className="w-3.5 h-3.5" /> Assistir replay</>
                  : <><ExternalLink className="w-3.5 h-3.5" /> Acessar treinamento</>
              }
            </div>
          </div>

          {/* Materials */}
          {materials.length > 0 && (
            <div className="border-t border-border px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materiais de apoio</p>
              {materials.map(mat => (
                <div key={mat.id} className="flex items-center gap-1.5 text-xs text-foreground py-0.5">
                  <MaterialTypeIcon type={mat.type} />
                  <span className="truncate">{mat.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!item.is_active && (
          <p className="text-center text-xs text-amber-400 mt-2">Este treinamento está como rascunho — não aparece para os alunos.</p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

type TrainingItemWithEdit = TrainingItem & { canEdit?: boolean }

export function TrainingsManager({ items, canCreate = true }: { items: TrainingItemWithEdit[]; canCreate?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<TrainingItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<TrainingType>('link')
  const [isPending, startTransition] = useTransition()
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingMaterialFor, setAddingMaterialFor] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<TrainingItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function resetForm() {
    setShowForm(false)
    setEditing(null)
    setCoverPreview(null)
    setCoverFile(null)
    setFormType('link')
  }

  function handleEdit(item: TrainingItem) {
    setEditing(item)
    setFormType((item.type ?? 'link') as TrainingType)
    setCoverPreview(item.cover_url ?? null)
    setCoverFile(null)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Foto de celular facilmente passa de 5-10MB — enviar isso cru pro server
    // action (que só comprime DEPOIS de receber) estoura o limite de body do
    // Next.js e derruba a página sem erro amigável. Barra aqui, antes do envio.
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      e.target.value = ''
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (coverFile) {
          const upload = await uploadTrainingCover(coverFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('cover_url', upload.url ?? '')
        }
        const result = editing
          ? await updateTrainingItem(editing.id, fd)
          : await createTrainingItem(fd)
        if (result?.error) toast.error(result.error)
        else {
          toast.success(editing ? 'Treinamento atualizado!' : 'Treinamento criado!')
          if (result?.notify) {
            if ('notified' in result.notify) toast.success(`${result.notify.notified} membro(s) notificado(s)`)
            else if (result.notify.error === 'no_members') toast.info('Nenhum membro ativo para notificar')
            else toast.error(`Falha ao notificar: ${result.notify.error}`)
          }
          resetForm()
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar o treinamento. Tente novamente com uma imagem menor.')
      }
    })
  }

  function handleTogglePublish(item: TrainingItem) {
    startTransition(async () => {
      const result = await toggleTrainingActive(item.id, !item.is_active)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(item.is_active ? 'Treinamento despublicado.' : 'Treinamento publicado!')
        if (result?.notify) {
          if ('notified' in result.notify) toast.success(`${result.notify.notified} membro(s) notificado(s)`)
          else if (result.notify.error === 'no_members') toast.info('Nenhum membro ativo para notificar')
          else toast.error(`Falha ao notificar: ${result.notify.error}`)
        }
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTrainingItem(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Treinamento removido.'); router.refresh() }
    })
  }

  function handleDeleteMaterial(materialId: string) {
    startTransition(async () => {
      const result = await deleteTrainingMaterial(materialId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Material removido.'); router.refresh() }
    })
  }

  const urlLabel = formType === 'live' ? 'Link para entrar ao vivo' : formType === 'replay' ? 'Link do replay' : 'URL do treinamento'

  return (
    <>
      {/* Preview modal */}
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      <div className="space-y-6">
        {/* ── Form ── */}
        {showForm ? (
          <form key={editing?.id ?? 'new'} ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-foreground">{editing ? 'Editar treinamento' : 'Novo treinamento'}</p>
              <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type selector */}
              <div className="md:col-span-2">
                <Label>Tipo de conteúdo</Label>
                <div className="flex gap-2 mt-1.5">
                  {(['link', 'live', 'replay'] as TrainingType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                        formType === t
                          ? t === 'live' ? 'bg-red-500 text-white border-red-500'
                            : t === 'replay' ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t === 'live' ? <Radio className="w-3.5 h-3.5" /> : t === 'replay' ? <RotateCcw className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      {t === 'live' ? 'Ao vivo' : t === 'replay' ? 'Replay' : 'Link'}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="type" value={formType} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" name="title" required defaultValue={editing?.title} placeholder="Nome do treinamento" className="mt-1.5" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" rows={2} defaultValue={editing?.description ?? ''} placeholder="Breve descrição..." className="mt-1.5 resize-none" />
              </div>

              {/* Live date/time */}
              {formType === 'live' && (
                <div className="md:col-span-2">
                  <Label htmlFor="live_at">Data e hora da sessão ao vivo *</Label>
                  <DateTimePicker
                    name="live_at"
                    required
                    defaultValue={toLiveDateInput(editing?.live_at ?? null)}
                    className="mt-1.5"
                    placeholder="Selecionar data e hora do ao vivo"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <Label htmlFor="url">{urlLabel} *</Label>
                <Input id="url" name="url" required type="url" defaultValue={editing?.url} placeholder="https://..." className="mt-1.5" />
              </div>

              {/* Cover */}
              <div className="md:col-span-2">
                <Label>Imagem de capa</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Recomendado: <strong>1280 × 720px</strong> (16:9) · JPG, PNG, WebP
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div
                    className={cn(
                      'relative w-full sm:w-48 aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors',
                      coverPreview && 'border-solid border-border'
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {coverPreview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <ImageIcon className="w-7 h-7" />
                        <span className="text-xs text-center leading-tight px-2">Clique para<br />fazer upload</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-2 flex-1">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 w-fit">
                      <Upload className="w-4 h-4" />
                      {coverPreview ? 'Trocar imagem' : 'Selecionar imagem'}
                    </Button>
                    {coverPreview && (
                      <button type="button" onClick={() => { setCoverPreview(null); setCoverFile(null) }} className="text-xs text-muted-foreground hover:text-red-500 transition-colors text-left">
                        Remover imagem
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">Ou cole uma URL:</p>
                    <Input
                      name="cover_url"
                      type="url"
                      value={coverFile ? '' : (coverPreview ?? '')}
                      onChange={(e) => { setCoverFile(null); setCoverPreview(e.target.value || null) }}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="order_index">Ordem</Label>
                <Input id="order_index" name="order_index" type="number" min={0} defaultValue={editing?.order_index ?? items.length} className="mt-1.5" />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_active" value="true" defaultChecked={editing ? editing.is_active : true} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-foreground">Ativo (visível para membros)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar treinamento'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
            </div>
          </form>
        ) : canCreate ? (
          <Button onClick={() => { setFormType('link'); setShowForm(true) }} className="gap-2">
            <Plus className="w-4 h-4" /> Novo treinamento
          </Button>
        ) : null}

        {/* ── List ── */}
        {items.length === 0 && !showForm ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum treinamento ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">Crie o primeiro treinamento para os membros.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedId === item.id
              const materials = item.materials ?? []
              const isLiveFuture = item.type === 'live' && item.live_at && new Date(item.live_at) > new Date()

              return (
                <div key={item.id} className={cn('bg-card border rounded-xl overflow-hidden transition-opacity', !item.is_active && 'opacity-70')}>
                  {/* Main row */}
                  <div className="flex items-start gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="w-20 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center mt-0.5">
                      {item.cover_url
                        ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                        : <GraduationCap className="w-6 h-6 text-muted-foreground/40" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <TypeBadge type={item.type ?? 'link'} />
                        <p className="font-semibold text-foreground truncate">{item.title}</p>
                        {!item.is_active && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 shrink-0">
                            <EyeOff className="w-3 h-3" /> Rascunho
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>}
                      {item.type === 'live' && item.live_at && (
                        <p className={cn('text-xs mt-0.5 flex items-center gap-1', isLiveFuture ? 'text-red-500' : 'text-muted-foreground')}>
                          <Clock className="w-3 h-3" />
                          {isLiveFuture ? `Ao vivo: ${formatBrazilDate(item.live_at)}` : `Encerrado: ${formatBrazilDate(item.live_at)}`}
                        </p>
                      )}
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5 w-fit">
                        <ExternalLink className="w-3 h-3" />
                        {item.url.length > 45 ? item.url.slice(0, 45) + '…' : item.url}
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {/* Preview */}
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Ver prévia"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Publish toggle */}
                      {(item.canEdit ?? true) && (item.is_active ? (
                        <button
                          onClick={() => handleTogglePublish(item)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                          title="Despublicar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Publicado
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTogglePublish(item)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                          title="Publicar"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Publicar
                        </button>
                      ))}

                      {/* Materials */}
                      <button
                        onClick={() => { setExpandedId(isExpanded ? null : item.id); if (!isExpanded) setAddingMaterialFor(null) }}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                          isExpanded ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        title="Materiais de apoio"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{materials.length}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {(item.canEdit ?? true) && (
                        <>
                          {/* Edit */}
                          <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                              disabled={isPending}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
                                <AlertDialogDescription>&quot;{item.title}&quot; e todos os materiais serão removidos permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Materials panel */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/20 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materiais de apoio</p>
                      <MaterialsList materials={materials} onDelete={handleDeleteMaterial} isPending={isPending} canEdit={item.canEdit ?? true} />
                      {(item.canEdit ?? true) && (addingMaterialFor === item.id ? (
                        <AddMaterialForm trainingId={item.id} onDone={() => setAddingMaterialFor(null)} />
                      ) : (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAddingMaterialFor(item.id)}>
                          <Plus className="w-3.5 h-3.5" /> Adicionar material
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
