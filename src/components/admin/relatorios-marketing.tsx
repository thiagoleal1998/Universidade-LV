'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Package2, Tag, Users2, Globe2 } from 'lucide-react'

type KpiProps = { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }

function MktKpi({ label, value, sub, icon: Icon, color }: KpiProps) {
  return (
    <div className="bg-card border rounded-lg p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

type HotelBar = { name: string; total: number }
type SliceData = { name: string; value: number; color: string }

type Props = {
  totalOfertas: number
  activeOfertas: number
  totalLaminas: number
  laminasB2B: number
  laminasB2C: number
  ofertasPorHotel: HotelBar[]
  audienciaPie: SliceData[]
  scopePie: SliceData[]
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--foreground))',
  fontSize: 12,
}

export function RelatoriosMarketing({
  totalOfertas, activeOfertas, totalLaminas, laminasB2B, laminasB2C,
  ofertasPorHotel, audienciaPie, scopePie,
}: Props) {
  const hasHotels = ofertasPorHotel.length > 0
  const hasAudiencia = audienciaPie.some((s) => s.value > 0)
  const hasScope = scopePie.some((s) => s.value > 0)

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MktKpi icon={Package2} label="Ofertas Diárias" value={totalOfertas}
          sub={`${activeOfertas} publicadas`} color="bg-blue-500/10 text-blue-500" />
        <MktKpi icon={Tag} label="Lâminas de Condições" value={totalLaminas}
          sub="total cadastrado" color="bg-purple-500/10 text-purple-500" />
        <MktKpi icon={Users2} label="Lâminas B2B" value={laminasB2B}
          sub="para trade/agências" color="bg-orange-500/10 text-orange-500" />
        <MktKpi icon={Globe2} label="Lâminas B2C" value={laminasB2C}
          sub="para consumidor final" color="bg-green-500/10 text-green-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Hotéis mais divulgados */}
        <div className="lg:col-span-2 bg-card border rounded-lg p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4">Hotéis / Produtos mais divulgados</h4>
          {hasHotels ? (
            <ResponsiveContainer width="100%" height={Math.max(180, ofertasPorHotel.length * 40)}>
              <BarChart
                layout="vertical"
                data={ofertasPorHotel}
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [v, 'Materiais']}
                  cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Nenhuma oferta cadastrada ainda.
            </div>
          )}
        </div>

        {/* Distribuição Audiência + Escopo */}
        <div className="flex flex-col gap-6">

          {/* Audiência B2B vs B2C */}
          <div className="bg-card border rounded-lg p-5 flex-1">
            <h4 className="text-sm font-semibold text-foreground mb-3">Lâminas por audiência</h4>
            {hasAudiencia ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={audienciaPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                    labelLine={false}
                  >
                    {audienciaPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Lâminas']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados de audiência.
              </div>
            )}
            <div className="flex gap-4 justify-center mt-1">
              {audienciaPie.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.name}: <strong className="text-foreground">{s.value}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Escopo Nacional vs Internacional */}
          {hasScope && (
            <div className="bg-card border rounded-lg p-5 flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-3">Ofertas por escopo</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={scopePie} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Ofertas']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {scopePie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
