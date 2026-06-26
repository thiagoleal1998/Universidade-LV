'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink, Copy, Check, Image as ImageIcon, Link2, FileText, Download, Calendar, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'

type Section = { key: string; label: string; type: string }
type MarketingProduct = { id: string; name: string }
type MarketingPeriod = { id: string; name: string }
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

function ShareButtons({ title, description, url }: { title: string; description?: string | null; url: string }) {
  const text = [title, description].filter(Boolean).join(' — ')
  const enc = (s: string) => encodeURIComponent(s)

  function copyInstagram() {
    navigator.clipboard.writeText(url)
    toast.success('Link copiado! Cole no Instagram.')
  }

  return (
    <div className="px-3 pb-3 pt-2 border-t border-border/40">
      <div className="flex gap-1.5">
        {/* WhatsApp */}
        <a
          href={`https://wa.me/?text=${enc(`${text}\n${url}`)}`}
          target="_blank" rel="noopener noreferrer"
          title="WhatsApp"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366] text-white hover:opacity-85 transition-opacity shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.133 1.532 5.873L0 24l6.318-1.647C8.01 23.469 9.96 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9c-1.85 0-3.55-.5-5.03-1.37l-.36-.21-3.73.98.99-3.63-.23-.37A9.9 9.9 0 0 1 2.1 12C2.1 6.53 6.53 2.1 12 2.1S21.9 6.53 21.9 12 17.47 21.9 12 21.9z"/>
          </svg>
        </a>

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
          target="_blank" rel="noopener noreferrer"
          title="Facebook"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1877F2] text-white hover:opacity-85 transition-opacity shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>

        {/* Instagram — copia o link */}
        <button
          type="button"
          onClick={copyInstagram}
          title="Copiar link para Instagram"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:opacity-85 transition-opacity shrink-0"
          style={{ background: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </button>

        {/* X (Twitter) */}
        <a
          href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`}
          target="_blank" rel="noopener noreferrer"
          title="X (Twitter)"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-black text-white hover:opacity-80 transition-opacity shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.698l7.748-8.857L1.809 2.25H8.1l4.258 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
          </svg>
        </a>
      </div>
    </div>
  )
}

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

function getDayLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return days[d.getDay()] ?? null
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

function OfertaCard({ item, products, periods }: { item: MarketingItem; products: MarketingProduct[]; periods: MarketingPeriod[] }) {
  const product = products.find((p) => p.id === item.product_id)
  const period = periods.find((p) => p.id === item.period_id)
  const dateStr = formatDate(item.publish_at ?? item.created_at)
  const isImage = item.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  const isB2B = item.audience === 'B2B'
  const isLastMinute = /last minute/i.test(item.title ?? '')

  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden flex flex-col',
      isLastMinute ? 'border-orange-400 dark:border-orange-600 ring-1 ring-orange-300 dark:ring-orange-700' :
      isB2B ? 'border-amber-200 dark:border-amber-800' : 'border-border',
    )}>
      {isLastMinute && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <span>🔥</span>
          <span>LAST MINUTE</span>
        </div>
      )}
      {!isLastMinute && isB2B && <div className="h-1 bg-amber-400" />}

      {item.url && isImage && (
        <div className="aspect-video bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Date bar — always visible */}
      <div className="flex items-center gap-1.5 px-3 pt-2">
        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{dateStr ?? '—'}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-3 pt-1.5 flex-wrap">
        <AudienceBadge audience={item.audience} />
        {product && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {product.name}
          </span>
        )}
        {period && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <CalendarRange className="w-2.5 h-2.5" />
            {period.name}
          </span>
        )}
      </div>

      <div className="px-3 pt-1.5 pb-1 flex-1">
        <p className="font-semibold text-xs text-foreground leading-snug">{item.title}</p>
        {item.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
      </div>

      {item.url && (
        <div className="px-3 pb-3 pt-1.5 flex gap-1.5">
          <a
            href={item.url}
            download
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Download className="w-3 h-3" />
            Baixar
          </a>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir
          </a>
        </div>
      )}
      {item.url && <ShareButtons title={item.title} description={item.description} url={item.url} />}
    </div>
  )
}

function OfertasDiariasLayout({ items, products, periods }: { items: MarketingItem[]; products: MarketingProduct[]; periods: MarketingPeriod[] }) {
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
    <div className="space-y-6">
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <span className="mt-0.5 shrink-0">⚠️</span>
        <p>
          As ofertas estão sujeitas à disponibilidade, alteração de valores e condições sem aviso prévio.
          Tarifas e condições poderão variar conforme a data da cotação, período da viagem, disponibilidade
          e regras de cada fornecedor. Consulte as condições específicas de cada oferta, incluindo políticas
          de cancelamento e demais restrições.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <h3 className="text-sm font-semibold text-foreground">Nacional</h3>
          <span className="text-xs text-muted-foreground">({nacional.length})</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {nacional.length === 0
            ? <p className="col-span-2 text-sm text-muted-foreground py-8 text-center border rounded-xl">Nenhuma oferta nacional.</p>
            : nacional.map((item) => {
                const dayLabel = getDayLabel(item.publish_at ?? item.created_at)
                return (
                  <div key={item.id}>
                    {dayLabel && (
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Oferta de {dayLabel}
                      </p>
                    )}
                    <OfertaCard item={item} products={products} periods={periods} />
                  </div>
                )
              })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Internacional</h3>
          <span className="text-xs text-muted-foreground">({internacional.length})</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {internacional.length === 0
            ? <p className="col-span-2 text-sm text-muted-foreground py-8 text-center border rounded-xl">Nenhuma oferta internacional.</p>
            : internacional.map((item) => {
                const dayLabel = getDayLabel(item.publish_at ?? item.created_at)
                return (
                  <div key={item.id}>
                    {dayLabel && (
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Oferta de {dayLabel}
                      </p>
                    )}
                    <OfertaCard item={item} products={products} periods={periods} />
                  </div>
                )
              })}
        </div>
      </div>
      </div>
    </div>
  )
}

function VisualGrid({ items, products, periods }: { items: MarketingItem[]; products: MarketingProduct[]; periods: MarketingPeriod[] }) {
  const sorted = [...items].sort((a, b) => {
    const da = a.publish_at ? new Date(a.publish_at).getTime() : 0
    const db = b.publish_at ? new Date(b.publish_at).getTime() : 0
    return db - da
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((item) => {
        const product = products.find((p) => p.id === item.product_id)
        const period = periods.find((p) => p.id === item.period_id)
        const dateStr = formatDate(item.publish_at ?? item.created_at)
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
              {period && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <CalendarRange className="w-3 h-3" />
                  {period.name}
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
  periods = [],
}: {
  sections: Section[]
  items: MarketingItem[]
  products?: MarketingProduct[]
  periods?: MarketingPeriod[]
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
        <OfertasDiariasLayout items={activeItems} products={products} periods={periods} />
      )}

      {isVisual && effectiveCategory !== 'ofertas_diarias' && (
        activeItems.length === 0
          ? <div className="text-center py-16 bg-card border rounded-xl"><p className="text-muted-foreground">Nenhum material nesta categoria.</p></div>
          : <VisualGrid items={activeItems} products={products} periods={periods} />
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
