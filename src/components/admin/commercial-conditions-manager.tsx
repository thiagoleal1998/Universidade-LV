'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createCommercialCondition, updateCommercialCondition, deleteCommercialCondition, toggleCommercialConditionActive,
  uploadCommercialConditionCover, uploadCommercialConditionLogo,
  type CommercialCondition,
} from '@/app/actions/commercial-conditions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ColorPicker } from '@/components/ui/color-picker'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'
import { HighlightBadge } from '@/components/ui/highlight-badge'
import { toRichHtml } from '@/lib/legacy-rich-text'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, X, Upload, ImageIcon, TrendingUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type CommercialConditionWithEdit = CommercialCondition & { canEdit?: boolean }

const LOGO_BG_PRESETS = ['#ffffff', '#000000', '#0f172a', '#3b82f6', '#22c55e', '#f59e0b']

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CommercialConditionsManager({ items, canCreate = true }: { items: CommercialConditionWithEdit[]; canCreate?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<CommercialCondition | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [descriptionValue, setDescriptionValue] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoBgColor, setLogoBgColor] = useState(DEFAULT_LOGO_BG)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function resetForm() {
    setShowForm(false)
    setEditing(null)
    setDescriptionValue('')
    setCoverPreview(null)
    setCoverFile(null)
    setLogoPreview(null)
    setLogoFile(null)
    setLogoBgColor(DEFAULT_LOGO_BG)
  }

  function handleEdit(item: CommercialCondition) {
    setEditing(item)
    setDescriptionValue(toRichHtml(item.description ?? ''))
    setCoverPreview(item.cover_url || null)
    setCoverFile(null)
    setLogoPreview(item.logo_url || null)
    setLogoFile(null)
    setLogoBgColor(item.logo_bg_color || DEFAULT_LOGO_BG)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Foto/imagem facilmente passa de 5-10MB — enviar isso cru pro server
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

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      e.target.value = ''
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // RichTextEditor não é um input nativo — o HTML não entra sozinho no
    // FormData acima (mesmo motivo de cover_url/logo_url serem sobrescritos
    // manualmente depois de um upload).
    fd.set('description', descriptionValue)
    startTransition(async () => {
      try {
        if (coverFile) {
          const upload = await uploadCommercialConditionCover(coverFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('cover_url', upload.url ?? '')
        }
        if (logoFile) {
          const upload = await uploadCommercialConditionLogo(logoFile)
          if (upload.error) { toast.error(upload.error); return }
          fd.set('logo_url', upload.url ?? '')
        }
        const result = editing ? await updateCommercialCondition(editing.id, fd) : await createCommercialCondition(fd)
        if (result?.error) toast.error(result.error)
        else {
          toast.success(editing ? 'Condição atualizada!' : 'Condição criada!')
          resetForm()
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar a condição. Tente novamente com uma imagem menor.')
      }
    })
  }

  function handleToggle(item: CommercialCondition) {
    startTransition(async () => {
      const result = await toggleCommercialConditionActive(item.id, !item.is_active)
      if (result?.error) toast.error(result.error)
      else { toast.success(item.is_active ? 'Condição despublicada.' : 'Condição publicada!'); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCommercialCondition(id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Condição removida.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      {showForm ? (
        <form key={editing?.id ?? 'new'} ref={formRef} onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-foreground">{editing ? 'Editar condição comercial' : 'Nova condição comercial'}</p>
            <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="cc-title">Título *</Label>
              <Input id="cc-title" name="title" required defaultValue={editing?.title} placeholder="Ex.: Hotéis Estrelas — Tarifas negociadas" className="mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="cc-description">Descrição</Label>
              <div className="mt-1.5">
                <RichTextEditor content={descriptionValue} onChange={setDescriptionValue} />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="cc-url">Link de detalhes</Label>
              <Input id="cc-url" name="url" type="url" defaultValue={editing?.url} placeholder="https://..." className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="cc-expires-at">Válido até</Label>
              <Input id="cc-expires-at" name="expires_at" type="date" defaultValue={editing?.expires_at ?? ''} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco pra não expirar. A partir do dia seguinte, some da tela dos membros — mas continua aqui pra você renovar.
              </p>
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
                      <img src={coverPreview} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
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

            {/* Texto de destaque — badge livre no canto inferior direito da
                capa (a logo fica no canto oposto, superior esquerdo). Campo
                de texto simples, sem preview dedicado — o resultado final já
                aparece no próprio card da lista logo abaixo. */}
            <div className="md:col-span-2">
              <Label htmlFor="cc-highlight">Texto de destaque sobre a capa (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Aparece como uma etiqueta no canto inferior direito da imagem — ex.: <strong>7x6</strong>, <strong>30% OFF</strong>.
              </p>
              <Input id="cc-highlight" name="highlight_text" defaultValue={editing?.highlight_text ?? ''} placeholder="Ex.: 7x6" maxLength={20} className="max-w-xs" />
            </div>

            {/* Logo do hotel/parceiro — separada da capa de propósito: a capa
                é a foto do destino, a logo é o brasão da marca, exibida
                pequena por cima da capa (mesmo padrão de Corrida de Vendas). */}
            <div className="md:col-span-2">
              <Label>Logo do hotel/parceiro (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Aparece dentro de um quadrado colorido, por cima da imagem de capa — escolha a cor de fundo abaixo pra combinar com a logo (útil quando ela é clara/branca e some direto sobre a foto).
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div
                  className={cn(
                    'relative w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors',
                    logoPreview && 'border-solid border-border'
                  )}
                  style={logoPreview ? { backgroundColor: logoBgColor } : undefined}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Preview da logo" referrerPolicy="no-referrer" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-muted/30 text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-2 flex-1">
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleLogoFileChange} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="gap-2 w-fit">
                    <Upload className="w-4 h-4" />
                    {logoPreview ? 'Trocar logo' : 'Selecionar logo'}
                  </Button>
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null) }} className="text-xs text-muted-foreground hover:text-red-500 transition-colors text-left">
                      Remover logo
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground">Ou cole uma URL:</p>
                  <Input
                    name="logo_url"
                    type="url"
                    value={logoFile ? '' : (logoPreview ?? '')}
                    onChange={(e) => { setLogoFile(null); setLogoPreview(e.target.value || null) }}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                  <div className="pt-1">
                    <Label className="text-xs text-muted-foreground">Cor de fundo do quadrado</Label>
                    <div className="mt-1.5">
                      <ColorPicker color={logoBgColor} onChange={setLogoBgColor} presets={LOGO_BG_PRESETS} swatchSize="w-5 h-5" />
                    </div>
                  </div>
                  <input type="hidden" name="logo_bg_color" value={logoBgColor} />
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
              {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar condição'}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      ) : canCreate ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova condição comercial
        </Button>
      ) : null}

      {/* ── List ── */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma condição comercial cadastrada ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie a primeira para os membros verem em Condições Comerciais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className={cn('rounded-xl border border-border bg-card overflow-hidden', !item.is_active && 'opacity-60')}>
              <div className="relative">
                {item.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.cover_url} alt={item.title} referrerPolicy="no-referrer" className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                {item.logo_url && (
                  <LogoChip
                    logoUrl={item.logo_url}
                    bgColor={item.logo_bg_color}
                    className="absolute top-2 left-2 max-w-[110px] px-2 py-1.5"
                    imgClassName="h-6 w-auto max-w-full"
                  />
                )}
                {item.highlight_text && (
                  <HighlightBadge text={item.highlight_text} className="absolute bottom-2 right-2" />
                )}
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground leading-snug">{item.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.expires_at && item.expires_at < todayIsoDate() && (
                      <span className="text-[10px] uppercase font-semibold text-red-500 bg-red-500/10 rounded px-1.5 py-0.5" title={`Expirou em ${new Date(item.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')} — edite pra renovar`}>
                        Expirado
                      </span>
                    )}
                    {!item.is_active && <span className="text-[10px] uppercase font-semibold text-amber-500 bg-amber-500/10 rounded px-1.5 py-0.5">Rascunho</span>}
                  </div>
                </div>
                {item.description && item.description !== '<p></p>' && (
                  <div className="rich-text text-sm text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: toRichHtml(item.description) }} />
                )}
                {item.expires_at && (
                  <p className={cn('text-xs', item.expires_at < todayIsoDate() ? 'text-red-500' : 'text-muted-foreground')}>
                    Válido até {new Date(item.expires_at + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
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
                          <AlertDialogTitle>Excluir condição comercial?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A condição <strong>{item.title}</strong> será removida e sairá da tela de Condições Comerciais dos membros. Essa ação não pode ser desfeita.
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
