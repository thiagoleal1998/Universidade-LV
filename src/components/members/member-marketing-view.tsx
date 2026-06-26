'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink, Copy, Check, Image as ImageIcon, Link2, FileText, Download, Calendar } from 'lucide-react'
import { toast } from 'sonner'

type Section = { key: string; label: string; type: string }
type MarketingProduct = { id: string; name: string }
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
  publish_at?: string | null
  created_at?: string | null
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  visual: ImageIcon,
  link:   Link2,
  text:   FileText,
}

const VISUAL_SUBSECTIONS = [
  { key: 'ofertas_diarias', label: 'Ofertas Diárias' },
  { key: 'laminas',         label: 'Lâminas de Condições' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AudienceBadge({ audience }: { audience: string | null | undefined }) {
  if (!audience) return null
  if (audience === 'B2C') return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      B2C
    </span>
  )
  if (audience === 'B2B') return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      B2B
    </span>
  )
  return null
}

function OfertaCard({ item, products }: { item: MarketingItem; products: MarketingProduct[] }) {
  const product = products.find((p) => p.id === item.product_id)
  const dateStr = formatDate(item.publish_at ?? item.created_at)
  const isImage = item.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const isB2B = item.audience === 'B2B'

  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden flex flex-col',
      isB2B ? 'border-amber-200 dark:border-amber-800' : 'border-border',
    )}>
      {isB2B && <div className="h-1 bg-amber-400" />}

      {item.url && isImage && (
        <div className="aspect-video bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Date bar — always visible */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          Publicado em <span className="font-semibold text-foreground">{dateStr ?? '—'}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 px-4 pt-2 flex-wrap">
        <AudienceBadge audience={item.audience} />
        {product && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {product.name}
          </span>
        )}
      </div>

      <div className="px-4 pt-2 pb-1 flex-1">
        <p className="font-semibold text-sm text-foreground">{item.title}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
      </div>

      {item.url && (
        <div className="px-4 pb-4 pt-2 flex gap-2">
          <a
            href={item.url}
            download
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar
          </a>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </div>
      )}
    </div>
  )
}

function OfertasDiariasLayout({ items, products }: { items: MarketingItem[]; products: MarketingProduct[] }) {
  const sorted = [...items].sort((a, b) => {
    const da = a.publish_at ? new Date(a.publish_at).getTime() : 0
    const db = b.publish_at ? new Date(b.publish_at).getTime() : 0
    return db - da
  })

  const nacional = sorted.filter((i) => i.scope === 'Nacional' || !i.scope)
  const internacional = sorted.filter((i) => i.scope === 'Internacional')

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <p className="text-muted-foreground">Nenhuma oferta disponível.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h3 className="text-sm font-semibold text-foreground">Nacional</h3>
          <span className="text-xs text-muted-foreground">({nacional.length})</span>
        </div>
        <div className="space-y-4">
          {nacional.length === 0
            ? <p className="text-sm text-muted-foreground py-8 text-center border rounded-xl">Nenhuma oferta nacional.</p>
            : nacional.map((item) => <OfertaCard key={item.id} item={item} products={products} />)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Internacional</h3>
          <span className="text-xs text-muted-foreground">({internacional.length})</span>
        </div>
        <div className="space-y-4">
          {internacional.length === 0
            ? <p className="text-sm text-muted-foreground py-8 text-center border rounded-xl">Nenhuma oferta internacional.</p>
            : internacional.map((item) => <OfertaCard key={item.id} item={item} products={products} />)}
        </div>
      </div>
    </div>
  )
}

function VisualGrid({ items, products }: { items: MarketingItem[]; products: MarketingProduct[] }) {
  const sorted = [...items].sort((a, b) => {
    const da = a.publish_at ? new Date(a.publish_at).getTime() : 0
    const db = b.publish_at ? new Date(b.publish_at).getTime() : 0
    return db - da
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((item) => {
        const product = products.find((p) => p.id === item.product_id)
        const dateStr = formatDate(item.publish_at)
        const isImage = item.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
        return (
          <div key={item.id} className="bg-card border rounded-xl overflow-hidden group flex flex-col">
            {item.url && isImage && (
              <div className="aspect-video bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            )}
            <div className="flex items-center gap-2 px-4 pt-3 flex-wrap">
              <AudienceBadge audience={item.audience} />
              {product && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {product.name}
                </span>
              )}
              {dateStr && (
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {dateStr}
                </span>
              )}
            </div>
            <div className="px-4 pt-2 pb-1 flex-1">
              <p className="font-medium text-foreground text-sm">{item.title}</p>
              {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
            </div>
            {item.url && (
              <div className="px-4 pb-4 pt-2 flex gap-2">
                <a
                  href={item.url}
                  download
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir
                </a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MemberMarketingView({
  sections,
  items,
  products = [],
}: {
  sections: Section[]
  items: MarketingItem[]
  products?: MarketingProduct[]
}) {
  const [activeKey, setActiveKey] = useState(sections[0]?.key ?? '')
  const [visualSubTab, setVisualSubTab] = useState(VISUAL_SUBSECTIONS[0].key)

  const activeSection = sections.find((s) => s.key === activeKey)
  const isVisual = activeSection?.type === 'visual'
  const effectiveCategory = isVisual ? visualSubTab : activeKey
  const activeItems = items.filter((i) => i.category === effectiveCategory)

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <p className="text-muted-foreground">Nenhum material disponível ainda.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs principais */}
      <div className="flex gap-1 border-b border-border mb-0 overflow-x-auto">
        {sections.map((s) => {
          const Icon = CATEGORY_ICON[s.type] ?? FileText
          return (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0',
                activeKey === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Sub-tabs visuais */}
      {isVisual && (
        <div className="flex gap-0 border-b border-border mb-6">
          {VISUAL_SUBSECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setVisualSubTab(key)}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                visualSubTab === key
                  ? 'border-primary/70 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!isVisual && <div className="mb-6" />}

      {/* Conteúdo */}
      {isVisual && effectiveCategory === 'ofertas_diarias' && (
        <OfertasDiariasLayout items={activeItems} products={products} />
      )}

      {isVisual && effectiveCategory !== 'ofertas_diarias' && (
        activeItems.length === 0
          ? <div className="text-center py-16 bg-card border rounded-xl"><p className="text-muted-foreground">Nenhum material nesta categoria.</p></div>
          : <VisualGrid items={activeItems} products={products} />
      )}

      {activeSection?.type === 'link' && (
        activeItems.length === 0
          ? <div className="text-center py-16 bg-card border rounded-xl"><p className="text-muted-foreground">Nenhum link disponível.</p></div>
          : (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0">
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
      )}

      {activeSection?.type === 'text' && (
        activeItems.length === 0
          ? <div className="text-center py-16 bg-card border rounded-xl"><p className="text-muted-foreground">Nenhum conteúdo disponível.</p></div>
          : (
            <div className="space-y-4">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-card border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    {item.content && <CopyButton text={item.content} />}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground px-5 py-2 border-b border-border/50">{item.description}</p>
                  )}
                  {item.content && (
                    <pre className="text-sm text-foreground px-5 py-4 whitespace-pre-wrap font-sans leading-relaxed">
                      {item.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  )
}
