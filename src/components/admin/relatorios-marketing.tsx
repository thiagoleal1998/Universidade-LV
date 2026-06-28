'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Tag, Users2, Globe2, TrendingUp, LayoutGrid } from 'lucide-react'

type KpiProps = { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }

function MktKpi({ label, value, sub, icon: Icon, color }: KpiProps) {
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

type Bar2 = { name: string; total: number }
type Slice = { name: string; value: number; color: string }

type Props = {
  totalOfertas: number
  activeOfertas: number
  ofertasB2B: number
  ofertasB2C: number
  ofertasAudienciaPie: Slice[]
  totalLaminas: number
  laminasB2B: number
  laminasB2C: number
  ofertasPorHotel: Bar2[]
  laminasPorHotel: Bar2[]
  audienciaPie: Slice[]
  scopePie: Slice[]
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
}

function HorizontalBar({ data, color, label }: { data: Bar2[]; color: string; label: string }) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Nenhum item cadastrado ainda.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
      <BarChart layout="vertical" data={data} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`${v}`, label]}
          cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
        />
        <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Escopo como barras horizontais (nomes no eixo Y — sem truncar)
function ScopeBar({ data }: { data: Slice[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados de escopo.
      </div>
    )
  }
  const barData = data.map((d) => ({ name: d.name, total: d.value, color: d.color }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 48)}>
      <BarChart layout="vertical" data={barData} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`${v}`, 'Ofertas']}
          cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DonutChart({ data, label }: { data: Slice[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados de audiência definidos.
      </div>
    )
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={68}
            paddingAngle={3}
          >
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, label]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
        {data.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.name}: <strong className="text-foreground">{s.value}</strong>
            <span className="opacity-60">({total > 0 ? Math.round(s.value / total * 100) : 0}%)</span>
          </span>
        ))}
      </div>
    </>
  )
}

export function RelatoriosMarketing({
  totalOfertas, activeOfertas, ofertasB2B, ofertasB2C, ofertasAudienciaPie,
  totalLaminas, laminasB2B, laminasB2C,
  ofertasPorHotel, laminasPorHotel, audienciaPie, scopePie,
}: Props) {
  const ofertasSem = totalOfertas - ofertasB2B - ofertasB2C

  return (
    <div className="space-y-10">

      {/* ── Seção: Ofertas Diárias ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Ofertas Diárias</h3>
          <span className="text-xs text-muted-foreground">({totalOfertas} total · {activeOfertas} publicadas)</span>
        </div>

        {/* KPIs audiência */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MktKpi icon={Users2} label="B2B" value={ofertasB2B}
            sub="para trade / agências" color="bg-orange-500/10 text-orange-500" />
          <MktKpi icon={Globe2} label="B2C" value={ofertasB2C}
            sub="consumidor final" color="bg-green-500/10 text-green-500" />
          <MktKpi icon={Tag} label="Sem definição" value={ofertasSem}
            sub="audiência não definida" color="bg-slate-400/10 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hotéis mais divulgados */}
          <div className="lg:col-span-2 bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">Hotéis / Produtos mais divulgados</h4>
            <HorizontalBar data={ofertasPorHotel} color="#3b82f6" label="Materiais" />
          </div>

          <div className="flex flex-col gap-4">
            {/* Audiência B2B/B2C */}
            <div className="bg-card border rounded-lg p-5 flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por audiência</h4>
              <DonutChart data={ofertasAudienciaPie} label="Ofertas" />
            </div>

            {/* Escopo */}
            <div className="bg-card border rounded-lg p-5 flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">Por escopo</h4>
              <ScopeBar data={scopePie} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Seção: Lâminas de Condições ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Lâminas de Condições</h3>
          <span className="text-xs text-muted-foreground">({totalLaminas} total)</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MktKpi icon={Tag} label="Sem definição" value={totalLaminas - laminasB2B - laminasB2C}
            sub="audiência não definida" color="bg-slate-400/10 text-slate-400" />
          <MktKpi icon={Users2} label="B2B" value={laminasB2B}
            sub="para trade / agências" color="bg-orange-500/10 text-orange-500" />
          <MktKpi icon={Globe2} label="B2C" value={laminasB2C}
            sub="consumidor final" color="bg-green-500/10 text-green-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hotéis com lâminas */}
          <div className="lg:col-span-2 bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">Hotéis / Produtos com lâminas</h4>
            <HorizontalBar data={laminasPorHotel} color="#a855f7" label="Lâminas" />
          </div>

          {/* Distribuição B2B vs B2C */}
          <div className="bg-card border rounded-lg p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">Por audiência</h4>
            <DonutChart data={audienciaPie} label="Lâminas" />
          </div>
        </div>
      </section>

    </div>
  )
}
