'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Users2, Globe2, Tag, TrendingUp, LayoutGrid, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── tipos ───────────────────────────────────────────────────────────────────

type RawItem = {
  title?: string | null
  product_id?: string | null
  audience?: string | null
  scope?: string | null
  status?: string | null
  created_at?: string | null
}

type Product = { id: string; name: string }

type Props = {
  ofertasRaw: RawItem[]
  laminasRaw: RawItem[]
  products: Product[]
}

type Period = 'all' | 'today' | 'month' | 'year'

// ─── helpers ─────────────────────────────────────────────────────────────────

function matchPeriod(item: RawItem, period: Period): boolean {
  if (period === 'all' || !item.created_at) return true
  const d = new Date(item.created_at)
  const now = new Date()
  if (period === 'today') return d.toDateString() === now.toDateString()
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (period === 'year') return d.getFullYear() === now.getFullYear()
  return true
}

function groupByName(items: RawItem[], productMap: Map<string, string>): { name: string; total: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const name = (item.product_id && productMap.get(item.product_id)) || item.title || '(sem título)'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

function groupByScope(items: RawItem[]): { name: string; total: number; color: string }[] {
  const COLORS: Record<string, string> = { Nacional: '#3b82f6', Internacional: '#a855f7' }
  const counts = new Map<string, number>()
  for (const item of items) {
    const s = item.scope || 'Não informado'
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, total]) => ({ name, total, color: COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => b.total - a.total)
}

function audienceSlices(items: RawItem[]): { name: string; value: number; color: string }[] {
  const b2b = items.filter((i) => i.audience === 'B2B').length
  const b2c = items.filter((i) => i.audience === 'B2C').length
  const sem = items.filter((i) => !i.audience).length
  return [
    { name: 'B2B', value: b2b, color: '#f97316' },
    { name: 'B2C', value: b2c, color: '#22c55e' },
    ...(sem > 0 ? [{ name: 'Sem definir', value: sem, color: '#94a3b8' }] : []),
  ]
}

// ─── recharts tooltip style (sem CSS vars — inline styles não resolvem vars) ─

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 12,
  color: '#111827',
}
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: '#374151' }
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: '#6b7280', marginBottom: 2 }

// ─── sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function HorizontalBarChart({ data, fill, label }: { data: { name: string; total: number }[]; fill: string; label: string }) {
  if (data.length === 0) {
    return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Nenhum item no período selecionado.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
      <BarChart layout="vertical" data={data} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(v) => [`${v}`, label]}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="total" fill={fill} radius={[0, 4, 4, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ColoredHorizontalChart({ data }: { data: { name: string; total: number; color: string }[] }) {
  if (data.length === 0) {
    return <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Sem dados de escopo.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(100, data.length * 48)}>
      <BarChart layout="vertical" data={data} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(v) => [`${v}`, 'Ofertas']}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DonutAudiencia({ data, label }: { data: { name: string; value: number; color: string }[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">Sem audiência definida.</div>
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} label={false}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(v) => [`${v}`, label]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
        {data.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.name}: <strong>{s.value}</strong>
            <span className="text-muted-foreground">({total > 0 ? Math.round(s.value / total * 100) : 0}%)</span>
          </span>
        ))}
      </div>
    </>
  )
}

// ─── filtros ─────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  all: 'Todos', today: 'Hoje', month: 'Este mês', year: 'Este ano',
}

// ─── componente principal ─────────────────────────────────────────────────────

export function RelatoriosMarketing({ ofertasRaw, laminasRaw, products }: Props) {
  const [period, setPeriod] = useState<Period>('all')
  const [productId, setProductId] = useState<string>('all')

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p.name])),
    [products],
  )

  const ofertas = useMemo(() => {
    let items = ofertasRaw.filter((i) => matchPeriod(i, period))
    if (productId !== 'all') items = items.filter((i) => i.product_id === productId)
    return items
  }, [ofertasRaw, period, productId])

  const laminas = useMemo(() => {
    let items = laminasRaw.filter((i) => matchPeriod(i, period))
    if (productId !== 'all') items = items.filter((i) => i.product_id === productId)
    return items
  }, [laminasRaw, period, productId])

  const ofertasPorHotel = useMemo(() => groupByName(ofertas, productMap), [ofertas, productMap])
  const laminasPorHotel = useMemo(() => groupByName(laminas, productMap), [laminas, productMap])
  const ofertasAud = useMemo(() => audienceSlices(ofertas), [ofertas])
  const laminasAud = useMemo(() => audienceSlices(laminas), [laminas])
  const scopeData = useMemo(() => groupByScope(ofertas), [ofertas])

  const ofertasB2B = ofertasAud.find((s) => s.name === 'B2B')?.value ?? 0
  const ofertasB2C = ofertasAud.find((s) => s.name === 'B2C')?.value ?? 0
  const ofertasSem = ofertas.length - ofertasB2B - ofertasB2C
  const laminasB2B = laminasAud.find((s) => s.name === 'B2B')?.value ?? 0
  const laminasB2C = laminasAud.find((s) => s.name === 'B2C')?.value ?? 0
  const laminasSem = laminas.length - laminasB2B - laminasB2C

  const activeOfertas = ofertas.filter((i) => i.status === 'published').length

  return (
    <div className="space-y-8">

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Período */}
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Produto */}
        {products.length > 0 && (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos os produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Totais resumidos */}
        <span className="ml-auto text-xs text-muted-foreground">
          {ofertas.length} oferta{ofertas.length !== 1 ? 's' : ''} · {laminas.length} lâmina{laminas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Seção: Ofertas Diárias ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Ofertas Diárias</h3>
          <span className="text-xs text-muted-foreground">({ofertas.length} total · {activeOfertas} publicadas)</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <KpiCard icon={Users2} label="B2B" value={ofertasB2B} sub="trade / agências" color="bg-orange-500/10 text-orange-500" />
          <KpiCard icon={Globe2} label="B2C" value={ofertasB2C} sub="consumidor final" color="bg-green-500/10 text-green-500" />
          <KpiCard icon={Tag} label="Sem definição" value={ofertasSem} sub="audiência não definida" color="bg-slate-400/10 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">Hotéis / Produtos mais divulgados</h4>
            <HorizontalBarChart data={ofertasPorHotel} fill="#3b82f6" label="Materiais" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-card border rounded-lg p-5 flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por audiência</h4>
              <DonutAudiencia data={ofertasAud} label="Ofertas" />
            </div>
            <div className="bg-card border rounded-lg p-5 flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por escopo</h4>
              <ColoredHorizontalChart data={scopeData} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Seção: Lâminas ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Lâminas de Condições</h3>
          <span className="text-xs text-muted-foreground">({laminas.length} total)</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <KpiCard icon={Tag} label="Sem definição" value={laminasSem} sub="audiência não definida" color="bg-slate-400/10 text-slate-400" />
          <KpiCard icon={Users2} label="B2B" value={laminasB2B} sub="trade / agências" color="bg-orange-500/10 text-orange-500" />
          <KpiCard icon={Globe2} label="B2C" value={laminasB2C} sub="consumidor final" color="bg-green-500/10 text-green-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">Hotéis / Produtos com lâminas</h4>
            <HorizontalBarChart data={laminasPorHotel} fill="#a855f7" label="Lâminas" />
          </div>
          <div className="bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">Por audiência</h4>
            <DonutAudiencia data={laminasAud} label="Lâminas" />
          </div>
        </div>
      </section>

    </div>
  )
}
