'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Ticket, CircleDot, Clock, Trophy } from 'lucide-react'
import type { FeedbackReport } from '@/app/actions/feedback'

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

const STATUS_LABEL: Record<string, string> = { open: 'Aberto', in_progress: 'Em andamento', resolved: 'Finalizado' }
const STATUS_COLOR: Record<string, string> = { open: '#3b82f6', in_progress: '#f59e0b', resolved: '#10b981' }
const TYPE_LABEL: Record<string, string> = { bug: 'Bug', suggestion: 'Sugestão' }
const TYPE_COLOR: Record<string, string> = { bug: '#ef4444', suggestion: '#f59e0b' }

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

function Donut({ data, label }: { data: { name: string; value: number; color: string }[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">Nenhum chamado ainda.</div>
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={150} className="select-none">
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

function formatDuration(ms: number): string {
  if (ms <= 0) return '—'
  const hours = ms / 3_600_000
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function RelatoriosChamados({ reports }: { reports: FeedbackReport[] }) {
  const stats = useMemo(() => {
    const total = reports.length
    const byStatus = { open: 0, in_progress: 0, resolved: 0 } as Record<string, number>
    const byType = { bug: 0, suggestion: 0 } as Record<string, number>
    const byUser = new Map<string, { name: string; count: number }>()
    let resolvedDurationSum = 0
    let resolvedCount = 0

    for (const r of reports) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
      byType[r.type] = (byType[r.type] ?? 0) + 1

      const key = r.user_id
      const entry = byUser.get(key) ?? { name: r.member_name || 'Membro', count: 0 }
      entry.count += 1
      byUser.set(key, entry)

      if (r.status === 'resolved' && r.resolved_at) {
        resolvedDurationSum += new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()
        resolvedCount += 1
      }
    }

    const ranking = [...byUser.values()].sort((a, b) => b.count - a.count).slice(0, 15)
    const avgResolutionMs = resolvedCount > 0 ? resolvedDurationSum / resolvedCount : 0

    return { total, byStatus, byType, ranking, avgResolutionMs, resolvedCount }
  }, [reports])

  const statusData = (['open', 'in_progress', 'resolved'] as const).map((s) => ({
    name: STATUS_LABEL[s], value: stats.byStatus[s] ?? 0, color: STATUS_COLOR[s],
  }))
  const typeData = (['bug', 'suggestion'] as const).map((t) => ({
    name: TYPE_LABEL[t], value: stats.byType[t] ?? 0, color: TYPE_COLOR[t],
  }))

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Ticket} label="Total de chamados" value={stats.total} color="bg-primary/10 text-primary" />
        <KpiCard icon={CircleDot} label="Abertos" value={stats.byStatus.open ?? 0} color="bg-blue-500/10 text-blue-600" />
        <KpiCard icon={CircleDot} label="Em andamento" value={stats.byStatus.in_progress ?? 0} color="bg-amber-500/10 text-amber-600" />
        <KpiCard
          icon={Clock}
          label="Tempo médio até finalizar"
          value={formatDuration(stats.avgResolutionMs)}
          sub={`com base em ${stats.resolvedCount} finalizado(s)`}
          color="bg-emerald-500/10 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Por status</h3>
          <Donut data={statusData} label="Chamados" />
        </div>
        <div className="bg-card border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Por tipo</h3>
          <Donut data={typeData} label="Chamados" />
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Chamados por usuário
        </h3>
        <div className="bg-card border rounded-lg overflow-hidden">
          {stats.ranking.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum chamado ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, stats.ranking.length * 36)} className="select-none">
              <BarChart layout="vertical" data={stats.ranking} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12, fill: '#374151' }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  formatter={(v) => [`${v}`, 'Chamados']}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
