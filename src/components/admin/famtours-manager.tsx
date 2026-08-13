'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createFamtour, updateFamtour, deleteFamtour, toggleFamtourActive, uploadFamtourCover,
  type Famtour,
} from '@/app/actions/famtours'
import { resolveFamtourAccessRequest } from '@/app/actions/famtour-access'
import type { PendingAccessRequest } from '@/lib/access-lock'
import { ImageCropModal } from '@/components/admin/image-crop-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Plus, Trash2, Pencil, X, Upload, ImageIcon, Luggage, ExternalLink, Calendar, Crop,
  MapPin, Users, ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UF_NAMES } from '@/lib/estado-flag'

const UF_OPTIONS = Object.entries(UF_NAMES).sort((a, b) => a[1].localeCompare(b[1]))

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

type FamtourWithEdit = Famtour & { canEdit?: boolean; pendingAccessRequests?: PendingAccessRequest[] }

export function FamtoursManager({ items, canCreate = true }: { items: FamtourWithEdit[]; canCreate?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Famtour | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [selectedUfs, setSelectedUfs] = useState<string[]>([])
  const [accessExpandedId, setAccessExpandedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function revokeIfBlob(url: string | null) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
  }

  function resetForm() {
    setShowForm(false)
    setEditing(null)
    revokeIfBlob(coverPreview)
    setCoverPreview(null)
    setCoverFile(null)
    setSelectedUfs([])
  }

  function handleEdit(item: Famtour) {
    setEditing(item)
    setCoverPreview(item.cover_url || null)
    setCoverFile(null)
    setSelectedUfs(item.exclusive_ufs ?? [])
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function toggleUf(sigla: string) {
    setSelectedUfs((prev) => prev.includes(sigla) ? prev.filter((u) => u !== sigla) : [...prev, sigla])
  }

  function handleResolveAccess(requestId: string, famtourId: string, approve: boolean) {
    startTransition(async () => {
      const result = await resolveFamtourAccessRequest(requestId, famtourId, approve)
      if (result?.error) toast.error(result.error)
      else { toast.success(approve ? 'Acesso liberado!' : 'Solicitação negada.'); router.refresh() }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).')
      return
    }
    // Foto de celular facilmente passa de 5-10MB — enviar isso cru pro server
    // action (que só comprime DEPOIS de receber) estoura o limite de body do
    // Next.js e derruba a página sem erro amigável. Barra aqui, antes do envio.
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      return
    }
    // Abre o recorte (16:9) antes de usar como capa — mesmo padrão da foto
    // de instrutor em course-editor.tsx, em vez de aceitar o enquadramento
    // cru que o `object-cover` do CSS decidir sozinho.
    setCropSrc(URL.createObjectURL(file))
  }

  function handleCropConfirm(blob: Blob) {
    revokeIfBlob(cropSrc)
    revokeIfBlob(coverPreview)
    setCropSrc(null)
    const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(blob))
  }

  function handleCropClose() {
    revokeIfBlob(cropSrc)
    setCropSrc(null)
  }

  // Clique na prévia já preenchida reabre o recorte na MESMA imagem (pra
  // reposicionar), em vez de abrir o seletor de arquivo pra trocar por
  // outra — isso é o botão "Trocar imagem" ao lado, que continua abrindo
  // o seletor normalmente.
  function handlePreviewClick() {
    if (coverPreview) setCropSrc(coverPreview)
    else fileInputRef.current?.click()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('exclusive_ufs', JSON.stringify(selectedUfs))
    startTransition(async () => {
      try {
        if (coverFile) {
          const upload = await uploadFamtourCover(coverFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('cover_url', upload.url ?? '')
        }
        const result = editing ? await updateFamtour(editing.id, fd) : await createFamtour(fd)
        if (result?.error) toast.error(result.error)
        else {
          toast.success(editing ? 'Famtour atualizado!' : 'Famtour criado!')
          resetForm()
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar o famtour. Tente novamente com uma imagem menor.')
      }
    })
  }

  function handleToggle(item: Famtour) {
    startTransition(async () => {
      const result = await toggleFamtourActive(item.id, !item.is_active)
      if (result?.error) toast.error(result.error)
      else { toast.success(item.is_active ? 'Famtour despublicado.' : 'Famtour publicado!'); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFamtour(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Famtour removido.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      {showForm ? (
        <form key={editing?.id ?? 'new'} ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-foreground">{editing ? 'Editar famtour' : 'Novo famtour'}</p>
            <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="famtour-title">Nome / destino *</Label>
              <Input id="famtour-title" name="title" required defaultValue={editing?.title} placeholder="Ex.: Famtour Porto Seguro — Resort All Inclusive" className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="famtour-description">Descrição</Label>
              <Textarea id="famtour-description" name="description" rows={2} defaultValue={editing?.description ?? ''} placeholder="Breve descrição da viagem..." className="mt-1.5 resize-none" />
            </div>

            {/* `min` trava data passada só pra valor NOVO — se o famtour em
                edição já tinha uma data passada (viagem já rolou), o próprio
                valor atual continua válido pro navegador, senão salvar
                qualquer outro campo desse famtour ficaria impossível. */}
            <div>
              <Label htmlFor="famtour-start">Data de início</Label>
              <Input
                id="famtour-start" name="start_date" type="date"
                defaultValue={editing?.start_date ?? ''}
                min={editing?.start_date && editing.start_date < todayIso() ? editing.start_date : todayIso()}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="famtour-end">Data de fim</Label>
              <Input
                id="famtour-end" name="end_date" type="date"
                defaultValue={editing?.end_date ?? ''}
                min={editing?.end_date && editing.end_date < todayIso() ? editing.end_date : todayIso()}
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="famtour-url">Link de inscrição / detalhes</Label>
              <Input id="famtour-url" name="url" type="url" defaultValue={editing?.url} placeholder="https://..." className="mt-1.5" />
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
                  onClick={handlePreviewClick}
                  title={coverPreview ? 'Clique para reposicionar a imagem' : 'Clique para fazer upload'}
                >
                  {coverPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Crop className="w-5 h-5 text-white" />
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
                    <button type="button" onClick={() => { revokeIfBlob(coverPreview); setCoverPreview(null); setCoverFile(null) }} className="text-xs text-muted-foreground hover:text-red-500 transition-colors text-left">
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

            {/* Exclusividade por UF */}
            <div className="md:col-span-2">
              <Label>Exclusivo para UF(s) (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Deixe em branco pra liberar pra todo mundo. Marcando uma ou mais UFs, só agências dessas UFs
                acessam direto — as demais veem um selo &quot;Exclusivo&quot; e podem solicitar acesso.
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-border bg-muted/20">
                {UF_OPTIONS.map(([sigla, nome]) => {
                  const selected = selectedUfs.includes(sigla)
                  return (
                    <button
                      key={sigla}
                      type="button"
                      onClick={() => toggleUf(sigla)}
                      title={nome}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      )}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {sigla}
                    </button>
                  )
                })}
              </div>
              {selectedUfs.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Selecionadas: {selectedUfs.map((s) => UF_NAMES[s] ?? s).join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" value="true" defaultChecked={editing ? editing.is_active : true} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-foreground">Ativo (visível na home dos membros)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar famtour'}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>

          <ImageCropModal
            imageSrc={cropSrc}
            onClose={handleCropClose}
            onConfirm={handleCropConfirm}
            title="Ajustar imagem de capa"
            aspect={16 / 9}
            cropShape="rect"
          />
        </form>
      ) : canCreate ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo famtour
        </Button>
      ) : null}

      {/* ── List ── */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <Luggage className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum famtour cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro para divulgar na home dos membros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const pendingAccess = item.pendingAccessRequests ?? []
            const isAccessExpanded = accessExpandedId === item.id
            return (
            <div key={item.id} className={cn('rounded-xl border border-border bg-card overflow-hidden', !item.is_active && 'opacity-60')}>
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_url} alt={item.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                  <Luggage className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground leading-snug">{item.title}</p>
                  {!item.is_active && <span className="text-[10px] uppercase font-semibold text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5 shrink-0">Rascunho</span>}
                </div>
                {(item.exclusive_ufs?.length ?? 0) > 0 && (
                  <span
                    title={`Exclusivo para ${item.exclusive_ufs!.join(', ')}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 w-fit"
                  >
                    <MapPin className="w-3 h-3" /> {item.exclusive_ufs!.join(', ')}
                  </span>
                )}
                {(item.start_date || item.end_date) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatPeriod(item.start_date, item.end_date)}
                  </p>
                )}
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {item.url}
                  </a>
                )}
                <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                  {pendingAccess.length > 0 && (
                    <button
                      onClick={() => setAccessExpandedId(isAccessExpanded ? null : item.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                        isAccessExpanded ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                      )}
                      title="Solicitações de acesso pendentes"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{pendingAccess.length}</span>
                      {isAccessExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  {(item.canEdit ?? true) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="gap-1.5 h-7 text-xs">
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(item)} disabled={isPending} className="h-7 text-xs">
                        {item.is_active ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-red-500 gap-1" />}>
                          <Trash2 className="w-3 h-3" /> Excluir
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir famtour?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O famtour <strong>{item.title}</strong> será removido e sairá da home dos membros. Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
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

              {/* Solicitações de acesso panel */}
              {isAccessExpanded && pendingAccess.length > 0 && (
                <div className="border-t border-border px-4 pb-4 pt-3 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solicitações de acesso pendentes</p>
                  {pendingAccess.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{req.memberName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[req.company, req.uf ? (UF_NAMES[req.uf] ?? req.uf) : null].filter(Boolean).join(' — ') || 'Sem empresa/UF informada'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleResolveAccess(req.id, item.id, false)}
                        className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10"
                      >
                        <X className="w-3.5 h-3.5" /> Negar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleResolveAccess(req.id, item.id, true)}
                        className="h-7 text-xs gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aprovar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
