'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEvento, updateEvento, deleteEvento, toggleEventoActive, uploadEventoCover,
  uploadEventoGalleryPhoto, deleteEventoGalleryPhoto,
  createEventoTestimonial, updateEventoTestimonial, deleteEventoTestimonial, uploadEventoTestimonialPhoto,
  type Evento, type EventoPhoto, type EventoTestimonial,
} from '@/app/actions/eventos'
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
  Plus, Trash2, Pencil, X, Upload, ImageIcon, CalendarDays, ExternalLink, Calendar, Crop,
  Check, Video, MessageSquareQuote,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

type EventoPhotoWithUrl = EventoPhoto & { url: string }

type EventoWithEdit = Evento & {
  canEdit?: boolean
  photos?: EventoPhotoWithUrl[]
  testimonials?: EventoTestimonial[]
}

export function EventosManager({ items, canCreate = true }: { items: EventoWithEdit[]; canCreate?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<EventoWithEdit | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  // Cópia local de galeria/depoimentos — atualizada otimisticamente a cada
  // upload/criação/exclusão, em vez de depender de `editing` (que é só uma
  // referência ao `item` do momento em que o form abriu e não reflete
  // mutações feitas pelas actions de galeria/depoimento, que não passam
  // pelo handleSubmit principal).
  const [galleryPhotos, setGalleryPhotos] = useState<EventoPhotoWithUrl[]>([])
  const [testimonials, setTestimonials] = useState<EventoTestimonial[]>([])
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
    setGalleryPhotos([])
    setTestimonials([])
  }

  function handleEdit(item: EventoWithEdit) {
    setEditing(item)
    setCoverPreview(item.cover_url || null)
    setCoverFile(null)
    setGalleryPhotos(item.photos ?? [])
    setTestimonials(item.testimonials ?? [])
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
    // Abre o recorte (16:9) antes de usar como capa.
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

  function handlePreviewClick() {
    if (coverPreview) setCropSrc(coverPreview)
    else fileInputRef.current?.click()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (coverFile) {
          const upload = await uploadEventoCover(coverFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('cover_url', upload.url ?? '')
        }
        const result = editing ? await updateEvento(editing.id, fd) : await createEvento(fd)
        if (result?.error) toast.error(result.error)
        else {
          toast.success(editing ? 'Evento atualizado!' : 'Evento criado!')
          resetForm()
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar o evento. Tente novamente com uma imagem menor.')
      }
    })
  }

  function handleToggle(item: Evento) {
    startTransition(async () => {
      const result = await toggleEventoActive(item.id, !item.is_active)
      if (result?.error) toast.error(result.error)
      else { toast.success(item.is_active ? 'Evento despublicado.' : 'Evento publicado!'); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteEvento(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Evento removido.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      {showForm ? (
        <>
        <form key={editing?.id ?? 'new'} ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-foreground">{editing ? 'Editar evento' : 'Novo evento'}</p>
            <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="evento-title">Nome do evento *</Label>
              <Input id="evento-title" name="title" required defaultValue={editing?.title} placeholder="Ex.: Convenção Litoral Verde 2026" className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="evento-description">Descrição</Label>
              <Textarea id="evento-description" name="description" rows={2} defaultValue={editing?.description ?? ''} placeholder="Breve descrição do evento..." className="mt-1.5 resize-none" />
            </div>

            {/* `min` trava data passada só pra valor NOVO — se o evento em
                edição já tinha uma data passada (evento já aconteceu), o
                próprio valor atual continua válido pro navegador, senão
                salvar qualquer outro campo desse evento ficaria impossível. */}
            <div>
              <Label htmlFor="evento-start">Data de início</Label>
              <Input
                id="evento-start" name="start_date" type="date"
                defaultValue={editing?.start_date ?? ''}
                min={editing?.start_date && editing.start_date < todayIso() ? editing.start_date : todayIso()}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="evento-end">Data de fim</Label>
              <Input
                id="evento-end" name="end_date" type="date"
                defaultValue={editing?.end_date ?? ''}
                min={editing?.end_date && editing.end_date < todayIso() ? editing.end_date : todayIso()}
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="evento-url">Link de inscrição / detalhes</Label>
              <Input id="evento-url" name="url" type="url" defaultValue={editing?.url} placeholder="https://..." className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="evento-video" className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Link de vídeo (YouTube, Vimeo, Instagram...)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                YouTube e Vimeo aparecem embutidos na página do evento; qualquer outro link vira um botão &quot;Assistir vídeo&quot;.
              </p>
              <Input id="evento-video" name="video_url" type="url" defaultValue={editing?.video_url ?? ''} placeholder="https://..." className="mt-1.5" />
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
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar evento'}
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

        {/* Galeria/depoimentos exigem o evento já existir (o ID é FK das
            duas tabelas filhas) — só aparecem editando um evento salvo. */}
        {editing?.id && (
          <EventoGallerySection eventoId={editing.id} photos={galleryPhotos} onPhotosChange={setGalleryPhotos} />
        )}
        {editing?.id && (
          <EventoTestimonialsSection eventoId={editing.id} testimonials={testimonials} onTestimonialsChange={setTestimonials} />
        )}
        </>
      ) : canCreate ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo evento
        </Button>
      ) : null}

      {/* ── List ── */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum evento cadastrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro para divulgar na home dos membros.</p>
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
                  <CalendarDays className="w-8 h-8 text-muted-foreground/40" />
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
                <div className="flex items-center gap-1.5 pt-2 flex-wrap">
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
                            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O evento <strong>{item.title}</strong> será removido e sairá da home dos membros. Essa ação não pode ser desfeita.
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Galeria de fotos ─────────────────────────────────────────────────────

function EventoGallerySection({
  eventoId, photos, onPhotosChange,
}: {
  eventoId: string
  photos: EventoPhotoWithUrl[]
  onPhotosChange: (photos: EventoPhotoWithUrl[]) => void
}) {
  const [caption, setCaption] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      return
    }
    setIsUploading(true)
    try {
      const result = await uploadEventoGalleryPhoto(eventoId, file, caption.trim())
      if (result.error) toast.error(result.error)
      else if (result.data) {
        onPhotosChange([...photos, result.data as EventoPhotoWithUrl])
        setCaption('')
        toast.success('Foto adicionada à galeria!')
      }
    } catch {
      toast.error('Não foi possível enviar a foto. Tente novamente com uma imagem menor.')
    }
    setIsUploading(false)
  }

  async function handleDelete(photo: EventoPhotoWithUrl) {
    const result = await deleteEventoGalleryPhoto(photo.id, photo.storage_path, eventoId)
    if (result.error) toast.error(result.error)
    else { onPhotosChange(photos.filter((p) => p.id !== photo.id)); toast.success('Foto removida.') }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <p className="font-semibold text-foreground">Galeria de fotos</p>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || 'Foto da galeria'} className="w-full aspect-square object-cover" />
              {photo.caption && (
                <p className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-1 line-clamp-1">{photo.caption}</p>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                title="Excluir foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center pt-1">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Legenda da foto (opcional)"
          className="h-8 text-sm sm:max-w-xs"
        />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
          {isUploading ? <Spinner className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
          {isUploading ? 'Enviando...' : 'Adicionar foto'}
        </Button>
      </div>
    </div>
  )
}

// ── Depoimentos ──────────────────────────────────────────────────────────

const EMPTY_TESTIMONIAL_FORM = { author_name: '', author_role: '', photo_url: '', content: '' }

function EventoTestimonialsSection({
  eventoId, testimonials, onTestimonialsChange,
}: {
  eventoId: string
  testimonials: EventoTestimonial[]
  onTestimonialsChange: (testimonials: EventoTestimonial[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_TESTIMONIAL_FORM)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const photoFileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_TESTIMONIAL_FORM)
    setPhotoPreview(null)
  }

  function handleEdit(t: EventoTestimonial) {
    setEditingId(t.id)
    setForm({ author_name: t.author_name, author_role: t.author_role, photo_url: t.photo_url, content: t.content })
    setPhotoPreview(t.photo_url || null)
    setShowForm(true)
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor.')
      return
    }
    setIsUploadingPhoto(true)
    try {
      const result = await uploadEventoTestimonialPhoto(file)
      if (result.error) toast.error(result.error)
      else if (result.url) { setForm((f) => ({ ...f, photo_url: result.url as string })); setPhotoPreview(result.url) }
    } catch {
      toast.error('Não foi possível enviar a foto.')
    }
    setIsUploadingPhoto(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.author_name.trim()) { toast.error('Informe o nome de quem deu o depoimento.'); return }
    const fd = new FormData()
    fd.set('author_name', form.author_name)
    fd.set('author_role', form.author_role)
    fd.set('photo_url', form.photo_url)
    fd.set('content', form.content)
    setIsPending(true)
    try {
      if (editingId) {
        const result = await updateEventoTestimonial(editingId, eventoId, fd)
        if (result.error) toast.error(result.error)
        else {
          onTestimonialsChange(testimonials.map((t) => t.id === editingId ? { ...t, ...form } : t))
          toast.success('Depoimento atualizado!')
          resetForm()
        }
      } else {
        const result = await createEventoTestimonial(eventoId, fd)
        if (result.error) toast.error(result.error)
        else if (result.data) {
          onTestimonialsChange([...testimonials, result.data as EventoTestimonial])
          toast.success('Depoimento adicionado!')
          resetForm()
        }
      }
    } finally {
      setIsPending(false)
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteEventoTestimonial(id, eventoId)
    if (result.error) toast.error(result.error)
    else { onTestimonialsChange(testimonials.filter((t) => t.id !== id)); toast.success('Depoimento removido.') }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="w-4 h-4 text-muted-foreground" />
          <p className="font-semibold text-foreground">Depoimentos</p>
        </div>
        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar depoimento
          </Button>
        )}
      </div>

      {testimonials.length > 0 && (
        <div className="space-y-2">
          {testimonials.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              {t.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photo_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs font-semibold">
                  {t.author_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.author_name}{t.author_role && <span className="text-muted-foreground font-normal"> · {t.author_role}</span>}</p>
                {t.content && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{t.content}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => handleEdit(t)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(t.id)} className="p-1.5 text-muted-foreground hover:text-red-500" title="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-muted border border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              onClick={() => photoFileRef.current?.click()}
              title="Foto de quem deu o depoimento"
            >
              {isUploadingPhoto ? <Spinner className="w-4 h-4" /> : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <input ref={photoFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoFile} className="hidden" />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} placeholder="Nome *" className="h-8 text-sm" />
              <Input value={form.author_role} onChange={(e) => setForm((f) => ({ ...f, author_role: e.target.value }))} placeholder="Cargo/agência (opcional)" className="h-8 text-sm" />
            </div>
          </div>
          <Textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="O que essa pessoa disse sobre o evento..."
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
              {isPending ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  )
}
