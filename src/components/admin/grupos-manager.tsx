'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createGrupo, updateGrupo, deleteGrupo, toggleGrupoActive, uploadGrupoCover,
  type Grupo,
} from '@/app/actions/grupos'
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
import { Plus, Trash2, Pencil, X, Upload, ImageIcon, Users2, ExternalLink, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

type GrupoWithEdit = Grupo & { canEdit?: boolean }

export function GruposManager({ items, canCreate = true }: { items: GrupoWithEdit[]; canCreate?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Grupo | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function resetForm() {
    setShowForm(false)
    setEditing(null)
    setCoverPreview(null)
    setCoverFile(null)
  }

  function handleEdit(item: Grupo) {
    setEditing(item)
    setCoverPreview(item.cover_url || null)
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
          const upload = await uploadGrupoCover(coverFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('cover_url', upload.url ?? '')
        }
        const result = editing ? await updateGrupo(editing.id, fd) : await createGrupo(fd)
        if (result?.error) toast.error(result.error)
        else {
          toast.success(editing ? 'Grupo atualizado!' : 'Grupo criado!')
          resetForm()
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar o grupo. Tente novamente com uma imagem menor.')
      }
    })
  }

  function handleToggle(item: Grupo) {
    startTransition(async () => {
      const result = await toggleGrupoActive(item.id, !item.is_active)
      if (result?.error) toast.error(result.error)
      else { toast.success(item.is_active ? 'Grupo despublicado.' : 'Grupo publicado!'); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGrupo(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Grupo removido.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      {showForm ? (
        <form key={editing?.id ?? 'new'} ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-foreground">{editing ? 'Editar grupo' : 'Novo grupo'}</p>
            <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="grupo-title">Nome da condição *</Label>
              <Input id="grupo-title" name="title" required defaultValue={editing?.title} placeholder="Ex.: Grupo Cancún — Saída fixa" className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="grupo-description">Descrição</Label>
              <Textarea id="grupo-description" name="description" rows={2} defaultValue={editing?.description ?? ''} placeholder="Condições da reserva em grupo..." className="mt-1.5 resize-none" />
            </div>

            <div>
              <Label htmlFor="grupo-start">Data de início</Label>
              <Input id="grupo-start" name="start_date" type="date" defaultValue={editing?.start_date ?? ''} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="grupo-end">Data de fim</Label>
              <Input id="grupo-end" name="end_date" type="date" defaultValue={editing?.end_date ?? ''} className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="grupo-url">Link de inscrição / detalhes</Label>
              <Input id="grupo-url" name="url" type="url" defaultValue={editing?.url} placeholder="https://..." className="mt-1.5" />
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

            <div className="flex items-center gap-3 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" value="true" defaultChecked={editing ? editing.is_active : true} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-foreground">Ativo (visível para os membros)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar grupo'}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      ) : canCreate ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo grupo
        </Button>
      ) : null}

      {/* ── List ── */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <Users2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum grupo cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro para divulgar aos membros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className={cn('rounded-xl border border-border bg-card overflow-hidden', !item.is_active && 'opacity-60')}>
              {item.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_url} alt={item.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                  <Users2 className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground leading-snug">{item.title}</p>
                  {!item.is_active && <span className="text-[10px] uppercase font-semibold text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5 shrink-0">Rascunho</span>}
                </div>
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
                {(item.canEdit ?? true) && (
                  <div className="flex items-center gap-1.5 pt-2">
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
                          <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O grupo <strong>{item.title}</strong> será removido e sairá da página de Grupos dos membros. Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
