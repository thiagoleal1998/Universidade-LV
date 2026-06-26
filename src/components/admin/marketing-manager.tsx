'use client'

import { useState, useTransition, useRef } from 'react'
import { ImageIcon, Link2, FileText, Plus, Trash2, Pencil, ExternalLink, Upload, Copy, X, Package, ChevronDown } from 'lucide-react'
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
  deleteMarketingProduct,
} from '@/app/actions/marketing'
import type { MarketingCategory, MarketingProduct } from '@/app/actions/marketing'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type SectionType = 'visual' | 'link' | 'text'
export type MarketingSection = { key: string; label: string; type: SectionType }

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

function ItemForm({
  cat,
  products,
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: {
  cat: CatDef
  products: MarketingProduct[]
  defaultValues?: Partial<MarketingItem>
  onSubmit: (data: SubmitData) => void
  isPending: boolean
  onCancel: () => void
}) {
  const [url, setUrl] = useState(defaultValues?.url ?? '')
  const [audience, setAudience] = useState(defaultValues?.audience ?? '')
  const [scope, setScope] = useState(defaultValues?.scope ?? '')
  const [productId, setProductId] = useState(defaultValues?.product_id ?? '')
  const [isUploading, startUpload] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

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
    onSubmit({
      title: (fd.get('title') as string) ?? '',
      description: (fd.get('description') as string) ?? '',
      content: (fd.get('content') as string) ?? '',
      url,
      audience: audience || undefined,
      scope: scope || undefined,
      product_id: productId || undefined,
    })
  }

  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const isVisual = cat.type === 'visual'

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
          {products.length === 0 && (
            <p className="text-xs text-muted-foreground">Cadastre produtos em &quot;Gerenciar Produtos&quot; acima.</p>
          )}
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

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isPending || isUploading}>
          {isPending
            ? <><Spinner className="w-4 h-4" /> Salvando...</>
            : defaultValues?.id
              ? 'Salvar'
              : <><Plus className="w-4 h-4 mr-1" /> Adicionar</>}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
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

function ItemTag({ children, color }: { children: React.ReactNode; color: 'blue' | 'green' | 'purple' }) {
  const cls = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }[color]
  return <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', cls)}>{children}</span>
}

function VisualCard({ item, cat, products }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[] }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isImage = item.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const product = products.find((p) => p.id === item.product_id)

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
        <ItemForm cat={cat} products={products} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden group">
      {isImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={item.url} alt={item.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
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
      {(item.audience || item.scope || product) && (
        <div className="flex flex-wrap gap-1 px-3 pb-2.5">
          {item.audience && <ItemTag color="blue">{item.audience}</ItemTag>}
          {item.scope && <ItemTag color="green">{item.scope}</ItemTag>}
          {product && <ItemTag color="purple">{product.name}</ItemTag>}
        </div>
      )}
    </div>
  )
}

function LinkRow({ item, cat, products }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[] }) {
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
        <ItemForm cat={cat} products={products} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg px-4 py-3 flex items-center gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Link2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{item.title}</p>
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

function TextRow({ item, cat, products }: { item: MarketingItem; cat: CatDef; products: MarketingProduct[] }) {
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
        <ItemForm cat={cat} products={products} defaultValues={item} onSubmit={handleUpdate} isPending={isPending} onCancel={() => setEditing(false)} />
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
  const [open, setOpen] = useState(false)
  const [newProduct, setNewProduct] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleAdd() {
    if (!newProduct.trim()) return
    startAdd(async () => {
      const r = await createMarketingProduct(newProduct)
      if (r?.error) toast.error(r.error)
      else { toast.success('Produto adicionado!'); setNewProduct('') }
    })
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const r = await deleteMarketingProduct(id)
      if (r?.error) toast.error(r.error)
      else toast.success('Produto removido!')
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

function CategorySection({ cat, items, products }: { cat: CatDef; items: MarketingItem[]; products: MarketingProduct[] }) {
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
          <ItemForm cat={cat} products={products} onSubmit={handleCreate} isPending={isCreating} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhum item adicionado ainda.
        </p>
      )}

      {cat.type === 'visual' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => <VisualCard key={item.id} item={item} cat={cat} products={products} />)}
        </div>
      ) : cat.type === 'link' ? (
        <div className="space-y-2">
          {items.map((item) => <LinkRow key={item.id} item={item} cat={cat} products={products} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => <TextRow key={item.id} item={item} cat={cat} products={products} />)}
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
}: {
  items: MarketingItem[]
  sections?: MarketingSection[]
  products?: MarketingProduct[]
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

      {/* Gerenciar Produtos — exibido apenas na aba visual */}
      {isVisual && (
        <div className="mt-3 mb-2">
          <ProductsManager products={products} />
        </div>
      )}

      {!isVisual && <div className="mb-6" />}

      {effectiveCat && (
        <CategorySection key={effectiveKey} cat={effectiveCat} items={tabItems} products={products} />
      )}
    </div>
  )
}
