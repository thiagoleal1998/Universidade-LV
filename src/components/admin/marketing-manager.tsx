'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, Link2, FileText, Plus, Trash2, Pencil, ExternalLink, Upload, Copy, X, Package, ChevronDown, Clock, Eye, BookDashed, Lock, CalendarRange, Maximize2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  createMarketingItem,
  updateMarketingItem,
  deleteMarketingItem,
  uploadMarketingFile,
  createMarketingProduct,
  updateMarketingProduct,
  deleteMarketingProduct,
  createMarketingPeriod,
  deleteMarketingPeriod,
} from '@/app/actions/marketing'
import type { MarketingCategory, MarketingProduct, MarketingPeriod } from '@/app/actions/marketing'
import { getTagColor } from '@/lib/tag-colors'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type SectionType = 'visual' | 'link' | 'text'
export type MarketingSection = { key: string; label: string; type: SectionType }
export type Tag = { id: string; name: string; color: string }

type ItemStatus = 'draft' | 'published' | 'scheduled'

type MarketingItem = {
  id: string
  category: string
  title: string
  description: string
  content: string
  url: string
  audience?: string | null
  scope?: string | null
  product_id?: string | null
  period_id?: string | null
  status?: ItemStatus | null
  publish_at?: string | null
  allowed_tag_ids?: string[] | null
  created_at: string
}

type SubmitData = {
  title: string
  description: string
  content: string
  url: string
  audience?: string
  scope?: string
  product_id?: string
  period_id?: string
  status: ItemStatus
  publish_at?: string
  allowed_tag_ids: string[]
}

type CatDef = {
  key: string
  label: string
  type: SectionType
  Icon: React.ElementType
  hasUrl: boolean
  hasFile: boolean
  hasContent: boolean
  urlLabel: string
  urlPlaceholder: string
  contentLabel: string
  contentPlaceholder: string
  deleteLabel: string
}

function sectionToCatDef(sec: MarketingSection): CatDef {
  if (sec.type === 'visual') return {
    key: sec.key, label: sec.label, type: 'visual', Icon: ImageIcon,
    hasUrl: true, hasFile: true, hasContent: false,
    urlLabel: 'URL da imagem / arquivo', urlPlaceholder: 'https://...',
    contentLabel: '', contentPlaceholder: '', deleteLabel: 'material',
  }
  if (sec.type === 'link') return {
    key: sec.key, label: sec.label, type: 'link', Icon: Link2,
    hasUrl: true, hasFile: false, hasContent: false,
    urlLabel: 'URL', urlPlaceholder: 'https://...',
    contentLabel: '', contentPlaceholder: '', deleteLabel: 'link',
  }
  return {
    key: sec.key, label: sec.label, type: 'text', Icon: FileText,
    hasUrl: false, hasFile: false, hasContent: true,
    urlLabel: '', urlPlaceholder: '',
    contentLabel: 'Conteúdo', contentPlaceholder: 'Escreva aqui...',
    deleteLabel: 'item',
  }
}

function parseAllowedTagIds(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') return val.replace(/^{|}$/g, '').split(',').filter(Boolean)
  return []
}

function AudiencePill({ value, label, active, onClick }: { value: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-muted-foreground border-border hover:border-primary/50',
      )}
    >
      {label}
    </button>
  )
}

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ItemForm({
  cat,
  products,
  periods = [],
  tags = [],
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  cat: CatDef
  products: MarketingProduct[]
  periods?: MarketingPeriod[]
  tags?: Tag[]
  defaultValues?: Partial<MarketingItem>
  onSubmit: (data: SubmitData) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [url, setUrl] = useState(defaultValues?.url ?? '')
  const [audience, setAudience] = useState(defaultValues?.audience ?? '')
  const [scope, setScope] = useState(defaultValues?.scope ?? '')
  const [productId, setProductId] = useState(defaultValues?.product_id ?? '')
  const [periodId, setPeriodId] = useState(defaultValues?.period_id ?? '')
  const [publishAt, setPublishAt] = useState(toLocalDatetimeValue(defaultValues?.publish_at))
  const [allowedTagIds, setAllowedTagIds] = useState<string[]>(parseAllowedTagIds(defaultValues?.allowed_tag_ids))
  const [isUploading, startUpload] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const statusRef = useRef<ItemStatus>(defaultValues?.status ?? 'published')

  function toggleTag(id: string) {
    setAllowedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startUpload(async () => {
      const r = await uploadMarketingFile(file)
      if (r?.error) toast.error(r.error)
      else if (r.url) { setUrl(r.url); toast.success('Arquivo enviado!') }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const status = statusRef.current
    const publishAtIso = publishAt ? new Date(publishAt).toISOString() : undefined
    if (status === 'scheduled' && !publishAtIso) {
      toast.error('Defina a data de divulgação para agendar.')
      return
    }
    onSubmit({
      title: (fd.get('title') as string) ?? '',
      description: (fd.get('description') as string) ?? '',
      content: (fd.get('content') as string) ?? '',
      url,
      audience: audience || undefined,
      scope: scope || undefined,
      product_id: productId || undefined,
      period_id: periodId || undefined,
      status,
      publish_at: publishAtIso,
      allowed_tag_ids: allowedTagIds,
    })
  }

  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const isVisual = cat.type === 'visual'
  const isEditing = !!defaultValues?.id

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input name="title" defaultValue={defaultValues?.title} placeholder="Nome do item" required />
      </div>

      {cat.hasUrl && (
        <div className="space-y-1.5">
          <Label>{cat.urlLabel}</Label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={cat.urlPlaceholder}
              className="flex-1"
            />
            {cat.hasFile && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  title="Fazer upload"
                >
                  {isUploading ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf,.zip,.ai,.psd"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
          {isImage && url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={url} alt="preview" className="h-28 rounded-lg object-cover border mt-1" />
          )}
        </div>
      )}

      {isVisual && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Público</Label>
            <div className="flex gap-1.5 flex-wrap">
              <AudiencePill
                value="B2C" label="B2C" active={audience === 'B2C'}
                onClick={() => setAudience(prev => prev === 'B2C' ? '' : 'B2C')}
              />
              <AudiencePill
                value="B2B" label="B2B" active={audience === 'B2B'}
                onClick={() => setAudience(prev => prev === 'B2B' ? '' : 'B2B')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Âmbito</Label>
            <div className="flex gap-1.5 flex-wrap">
              <AudiencePill
                value="Nacional" label="Nacional" active={scope === 'Nacional'}
                onClick={() => setScope(prev => prev === 'Nacional' ? '' : 'Nacional')}
              />
              <AudiencePill
                value="Internacional" label="Internacional" active={scope === 'Internacional'}
                onClick={() => setScope(prev => prev === 'Internacional' ? '' : 'Internacional')}
              />
            </div>
          </div>
        </div>
      )}

      {isVisual && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <select
              value={productId ?? ''}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">— Nenhum —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <select
              value={periodId ?? ''}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">— Nenhum —</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Input name="description" defaultValue={defaultValues?.description} placeholder="Breve descrição (opcional)" />
      </div>

      {cat.hasContent && (
        <div className="space-y-1.5">
          <Label>{cat.contentLabel}</Label>
          <Textarea
            name="content"
            defaultValue={defaultValues?.content}
            placeholder={cat.contentPlaceholder}
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      )}

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Visível para
          </Label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAllowedTagIds([])}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                allowedTagIds.length === 0
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50',
              )}
            >
              Todos os membros
            </button>
            {tags.map((tag) => {
              const c = getTagColor(tag.color)
              const selected = allowedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    selected
                      ? `${c.bg} ${c.text} border-transparent`
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                  {tag.name}
                </button>
              )
            })}
          </div>
          {allowedTagIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Somente membros com as tags selecionadas verão este item.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Data de divulgação</Label>
        <input
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <p className="text-xs text-muted-foreground">Opcional. Necessário apenas para agendar publicação.</p>
      </div>

      <div className="flex gap-2 pt-1 flex-wrap">
        {isPending ? (
          <Button size="sm" disabled>
            <Spinner className="w-4 h-4 mr-1" /> Salvando...
          </Button>
        ) : isEditing ? (
          <Button type="submit" size="sm" onClick={() => { statusRef.current = defaultValues?.status ?? 'published' }}>
            Salvar
          </Button>
        ) : (
          <>
            <Button
              type="submit" size="sm" variant="outline"
              disabled={isUploading}
              onClick={() => { statusRef.current = 'draft' }}
            >
              <BookDashed className="w-4 h-4 mr-1" /> Rascunho
            </Button>
            <Button
              type="submit" size="sm"
              disabled={isUploading}
              onClick={() => { statusRef.current = 'published' }}
            >
              <Eye className="w-4 h-4 mr-1" /> Publicar
            </Button>
            <Button
              type="submit" size="sm" variant="secondary"
              disabled={isUploading || !publishAt}
              onClick={() => { statusRef.current = 'scheduled' }}
              title={!publishAt ? 'Defina a data de divulgação' : ''}
            >
              <Clock className="w-4 h-4 mr-1" /> Agendar
            </Button>
          </>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
      </div>
    </form>
  )
}

function DeleteConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" />}>
        <Trash2 className="w-4 h-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {label}?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ItemTag({ children, color }: { children: React.ReactNode; color: 'blue' | 'green' | 'purple' | 'gray' | 'amber' }) {
  const cls = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    gray: 'bg-muted text-muted-foreground',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }[color]
  return <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', cls)}>{children}</span>
}

function StatusBadge({ item }: { item: MarketingItem }) {
  const status = item.status ?? 'published'
  if (status === 'draft') return <ItemTag color="gray">Rascunho</ItemTag>
  if (status === 'scheduled') {
    const date = item.publish_at ? new Date(item.publish_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
    return <ItemTag color="amber"><Clock className="w-3 h-3 inline mr-0.5" />Agendado {date}</ItemTag>
  }
  return null
}

function VisualCard({ item, cat, products, periods = [], tags = [] }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[]; periods?: MarketingPeriod[]; tags?: Tag[] }) {
  const [editing, setEditing] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isImage = item.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const product = products.find((p) => p.id === item.product_id)
  const period = periods.find((p) => p.id === item.period_id)
  const allowedIds = parseAllowedTagIds(item.allowed_tag_ids)
  const requiredTags = tags.filter((t) => allowedIds.includes(t.id))
  const restrictedToTags = requiredTags.length > 0

  function handleUpdate(data: SubmitData) {
    startTransition(async () => {
      const r = await updateMarketingItem(item.id, data)
      if (r?.error) toast.error(r.error)
      else { toast.success('Atualizado!'); setEditing(false) }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteMarketingItem(item.id)
      if (r?.error) toast.error(r.error)
      else toast.success('Removido!')
    })
  }

  if (editing) {
    return (
      <div className="bg-card border rounded-lg p-4 col-span-full">
        <ItemForm cat={cat} products={products} periods={periods} tags={tags} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && isImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-1.5 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.title}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="bg-card border rounded-lg overflow-hidden group">
        <div className="relative">
          {isImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.title} className="w-full h-40 object-cover" />
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100"
                title="Expandir imagem"
              >
                <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
              </button>
            </>
          ) : (
            <div className="w-full h-40 bg-muted flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="px-3 py-2.5 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir / baixar"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} disabled={isPending}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <DeleteConfirm label={cat.deleteLabel} onConfirm={handleDelete} />
          </div>
        </div>
        {(item.audience || item.scope || product || period || (item.status && item.status !== 'published') || restrictedToTags) && (
          <div className="flex flex-wrap gap-1 px-3 pb-2.5">
            <StatusBadge item={item} />
            {item.audience && <ItemTag color="blue">{item.audience}</ItemTag>}
            {item.scope && <ItemTag color="green">{item.scope}</ItemTag>}
            {product && <ItemTag color="purple">{product.name}</ItemTag>}
            {period && <ItemTag color="amber"><CalendarRange className="w-2.5 h-2.5 inline mr-0.5" />{period.name}</ItemTag>}
            {restrictedToTags && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                <Lock className="w-2.5 h-2.5" />
                {requiredTags.map((t) => {
                  const c = getTagColor(t.color)
                  return (
                    <span key={t.id} className={cn('flex items-center gap-1', c.text)}>
                      <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                      {t.name}
                    </span>
                  )
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function LinkRow({ item, cat, products, tags = [] }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[]; tags?: Tag[] }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(data: SubmitData) {
    startTransition(async () => {
      const r = await updateMarketingItem(item.id, data)
      if (r?.error) toast.error(r.error)
      else { toast.success('Atualizado!'); setEditing(false) }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteMarketingItem(item.id)
      if (r?.error) toast.error(r.error)
      else toast.success('Removido!')
    })
  }

  if (editing) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <ItemForm cat={cat} products={products} tags={tags} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  const restrictedToTags = (item.allowed_tag_ids ?? []).length > 0
  return (
    <div className="bg-card border rounded-lg px-4 py-3 flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Link2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm text-foreground">{item.title}</p>
          <StatusBadge item={item} />
          {restrictedToTags && <Lock className="w-3 h-3 text-muted-foreground" title="Visibilidade restrita por tag" />}
        </div>
        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
        {item.url && <p className="text-xs text-primary/80 truncate">{item.url}</p>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost" size="icon" title="Copiar link"
          onClick={() => { navigator.clipboard.writeText(item.url); toast.success('Link copiado!') }}
        >
          <Copy className="w-4 h-4" />
        </Button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)} disabled={isPending}>
          <Pencil className="w-4 h-4" />
        </Button>
        <DeleteConfirm label={cat.deleteLabel} onConfirm={handleDelete} />
      </div>
    </div>
  )
}

function TextRow({ item, cat, products, tags = [] }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[]; tags?: Tag[] }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(data: SubmitData) {
    startTransition(async () => {
      const r = await updateMarketingItem(item.id, data)
      if (r?.error) toast.error(r.error)
      else { toast.success('Atualizado!'); setEditing(false) }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteMarketingItem(item.id)
      if (r?.error) toast.error(r.error)
      else toast.success('Removido!')
    })
  }

  if (editing) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <ItemForm cat={cat} products={products} tags={tags} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => setExpanded((e) => !e)}
        >
          <p className="font-medium text-sm text-foreground hover:text-primary transition-colors">{item.title}</p>
          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          {!expanded && item.content && (
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{item.content}</p>
          )}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost" size="icon" title="Copiar conteúdo"
            onClick={() => { navigator.clipboard.writeText(item.content); toast.success('Copiado!') }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} disabled={isPending}>
            <Pencil className="w-4 h-4" />
          </Button>
          <DeleteConfirm label={cat.deleteLabel} onConfirm={handleDelete} />
        </div>
      </div>
      {expanded && item.content && (
        <div className="border-t bg-muted/30 px-4 py-3">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{item.content}</pre>
        </div>
      )}
    </div>
  )
}

function ProductsManager({ products }: { products: MarketingProduct[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newProduct, setNewProduct] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleAdd() {
    if (!newProduct.trim()) return
    startAdd(async () => {
      const r = await createMarketingProduct(newProduct)
      if (r?.error) toast.error(r.error)
      else { toast.success('Produto adicionado!'); setNewProduct(''); router.refresh() }
    })
  }

  function startEdit(p: MarketingProduct) {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  function handleSave(id: string) {
    startSave(async () => {
      const r = await updateMarketingProduct(id, editingName)
      if (r?.error) toast.error(r.error)
      else { toast.success('Produto atualizado!'); setEditingId(null); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const r = await deleteMarketingProduct(id)
      if (r?.error) toast.error(r.error)
      else { toast.success('Produto removido!'); router.refresh() }
    })
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Package className="w-4 h-4" />
        Gerenciar Produtos
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 bg-muted/40 border rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              placeholder="Nome do produto"
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            />
            <Button type="button" size="sm" onClick={handleAdd} disabled={isAdding || !newProduct.trim()}>
              {isAdding ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-1.5">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-card rounded-md px-3 py-2">
                  {editingId === p.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(p.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => handleSave(p.id)} disabled={isSaving}>
                        {isSaving ? <Spinner className="w-3 h-3" /> : 'Salvar'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1">{p.name}</span>
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button" variant="ghost" size="icon"
                        className="text-red-500 hover:text-red-600 h-7 w-7"
                        onClick={() => handleDelete(p.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PeriodsManager({ periods }: { periods: MarketingPeriod[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newPeriod, setNewPeriod] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleAdd() {
    if (!newPeriod.trim()) return
    startAdd(async () => {
      const r = await createMarketingPeriod(newPeriod)
      if (r?.error) toast.error(r.error)
      else { toast.success('Período adicionado!'); setNewPeriod(''); router.refresh() }
    })
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const r = await deleteMarketingPeriod(id)
      if (r?.error) toast.error(r.error)
      else { toast.success('Período removido!'); router.refresh() }
    })
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <CalendarRange className="w-4 h-4" />
        Gerenciar Períodos
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 bg-muted/40 border rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              placeholder="Ex: Julho 2025, Verão, Feriado..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            />
            <Button type="button" size="sm" onClick={handleAdd} disabled={isAdding || !newPeriod.trim()}>
              {isAdding ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {periods.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum período cadastrado.</p>
          ) : (
            <div className="space-y-1.5">
              {periods.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-card rounded-md px-3 py-2">
                  <span className="text-sm">{p.name}</span>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="text-red-500 hover:text-red-600 h-7 w-7"
                    onClick={() => handleDelete(p.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CategorySection({ cat, items, products, periods = [], tags = [] }: { cat: CatDef; items: MarketingItem[]; products: MarketingProduct[]; periods?: MarketingPeriod[]; tags?: Tag[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isCreating, startCreate] = useTransition()

  function handleCreate(data: SubmitData) {
    startCreate(async () => {
      const r = await createMarketingItem({ category: cat.key as MarketingCategory, ...data })
      if (r?.error) toast.error(r.error)
      else { toast.success('Adicionado!'); setShowForm(false) }
    })
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      )}

      {showForm && (
        <div className="bg-muted/40 border border-dashed rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">Novo item</p>
          <ItemForm cat={cat} products={products} periods={periods} tags={tags} onSubmit={handleCreate} isPending={isCreating} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhum item adicionado ainda.
        </p>
      )}

      {cat.type === 'visual' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => <VisualCard key={item.id} item={item} cat={cat} products={products} periods={periods} tags={tags} />)}
        </div>
      ) : cat.type === 'link' ? (
        <div className="space-y-2">
          {items.map((item) => <LinkRow key={item.id} item={item} cat={cat} products={products} tags={tags} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => <TextRow key={item.id} item={item} cat={cat} products={products} tags={tags} />)}
        </div>
      )}
    </div>
  )
}

const VISUAL_SUBSECTIONS: { key: string; label: string }[] = [
  { key: 'ofertas_diarias', label: 'Ofertas Diárias' },
  { key: 'laminas',         label: 'Lâminas de Condições' },
]

const DEFAULT_SECTIONS: MarketingSection[] = [
  { key: 'visual', label: 'Materiais Visuais', type: 'visual' },
  { key: 'link',   label: 'Links Úteis',        type: 'link'   },
]

export function MarketingManager({
  items,
  sections,
  products = [],
  periods = [],
  tags = [],
}: {
  items: MarketingItem[]
  sections?: MarketingSection[]
  products?: MarketingProduct[]
  periods?: MarketingPeriod[]
  tags?: Tag[]
}) {
  const cats = (sections && sections.length > 0 ? sections : DEFAULT_SECTIONS).map(sectionToCatDef)
  const [activeTab, setActiveTab] = useState(cats[0]?.key ?? 'visual')
  const [visualSubTab, setVisualSubTab] = useState(VISUAL_SUBSECTIONS[0].key)

  const cat = cats.find((c) => c.key === activeTab) ?? cats[0]
  const isVisual = cat?.type === 'visual'
  const effectiveKey = isVisual ? visualSubTab : activeTab
  const tabItems = items.filter((i) => i.category === effectiveKey)
  const effectiveCat = isVisual && cat ? { ...cat, key: effectiveKey } : cat

  if (cats.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-16">
      Nenhuma seção configurada. Adicione seções em Configurações → Marketing.
    </p>
  )

  return (
    <div>
      {/* Tabs principais */}
      <div className="flex gap-0 border-b border-border flex-wrap">
        {cats.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tabs de Materiais Visuais */}
      {isVisual && (
        <div className="flex gap-0 border-b border-border flex-wrap mb-4">
          {VISUAL_SUBSECTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setVisualSubTab(key)}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                visualSubTab === key
                  ? 'border-primary/70 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Gerenciar Produtos e Períodos — exibidos apenas na aba visual */}
      {isVisual && (
        <div className="mt-3 mb-2 flex flex-wrap gap-6">
          <ProductsManager products={products} />
          <PeriodsManager periods={periods} />
        </div>
      )}

      {!isVisual && <div className="mb-6" />}

      {effectiveCat && (
        <CategorySection key={effectiveKey} cat={effectiveCat} items={tabItems} products={products} periods={periods} tags={tags} />
      )}
    </div>
  )
}
