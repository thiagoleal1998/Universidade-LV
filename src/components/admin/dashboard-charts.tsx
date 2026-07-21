'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CheckCircle2, UserPlus, TrendingUp, Users, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── tipos ───────────────────────────────────────────────────────────────────

type Course = { id: string; name: string }
type ModuleRow = { id: string; title: string; course_id: string | null }
type LessonRow = { id: string; title: string; module_id: string }
type ProgressRow = { lesson_id: string; user_id: string; completed_at: string }
type MemberRow = { id: string; full_name: string; created_at: string }
type Enrollment = { member_id: string; course_id: string }

type Props = {
  courses: Course[]
  modules: ModuleRow[]
  lessons: LessonRow[]
  progress: ProgressRow[]
  members: MemberRow[]
  enrollments: Enrollment[]
}

type Preset = '7d' | '30d' | '90d' | 'year' | 'all'
type Granularity = 'day' | 'week' | 'month'

// ─── helpers de data ─────────────────────────────────────────────────────────

const PRESET_LABELS: Record<Preset, string> = {
  '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', year: 'Este ano', all: 'Tudo',
}

function resolveDateRange(preset: Preset, earliest: Date): { from: Date; to: Date } {
  const to = new Date()
  if (preset === 'all') return { from: earliest, to }
  if (preset === 'year') return { from: new Date(to.getFullYear(), 0, 1), to }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000), to }
}

function pickGranularity(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 31) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

function buildBuckets(from: Date, to: Date, granularity: Granularity): { start: Date; end: Date; label: string }[] {
  const buckets: { start: Date; end: Date; label: string }[] = []
  let cursor = new Date(from)
  let guard = 0
  while (cursor <= to && guard < 400) {
    const start = new Date(cursor)
    const end = new Date(cursor)
    if (granularity === 'day') end.setDate(end.getDate() + 1)
    else if (granularity === 'week') end.setDate(end.getDate() + 7)
    else end.setMonth(end.getMonth() + 1)
    const label = granularity === 'month'
      ? start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      : start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    buckets.push({ start, end, label })
    cursor = end
    guard++
  }
  return buckets
}

function countInBuckets(dates: Date[], buckets: { start: Date; end: Date; label: string }[]): { label: string; value: number }[] {
  return buckets.map((b) => ({
    label: b.label,
    value: dates.filter((d) => d >= b.start && d < b.end).length,
  }))
}

// ─── estilo dos tooltips (sem CSS vars — inline style do Recharts não resolve) ─

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#111827',
}
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: '#374151' }
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: '#6b7280', marginBottom: 2 }

// ─── sub-componentes de UI ───────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border rounded-lg p-4 flex items-start gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
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

function EmptyState({ text }: { text: string }) {
  return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">{text}</div>
}

function CompletionsAreaChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.every((d) => d.value === 0)) return <EmptyState text="Nenhuma conclusão no período selecionado." />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v) => [`${v}`, 'Conclusões']} />
        <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function NewMembersLineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.every((d) => d.value === 0)) return <EmptyState text="Nenhum cadastro novo no período selecionado." />
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v) => [`${v}`, 'Novos membros']} />
        <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function HorizontalBarChart({ data, fill, label, emptyText }: { data: { name: string; total: number }[]; fill: string; label: string; emptyText: string }) {
  if (data.length === 0) return <EmptyState text={emptyText} />
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart layout="vertical" data={data} margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(v) => [`${v}`, label]} cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="total" fill={fill} radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function EngagementDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <EmptyState text="Nenhum aluno considerado nesse filtro." />
  return (
    <>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} label={false}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v) => [`${v}`, 'Membros']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
        {data.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.name}: <strong>{s.value}</strong>
            <span className="text-muted-foreground">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </span>
        ))}
      </div>
    </>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export function DashboardCharts({ courses, modules, lessons, progress, members, enrollments }: Props) {
  const [courseId, setCourseId] = useState<string>('all')
  const [preset, setPreset] = useState<Preset>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [courses],
  )

  const earliest = useMemo(() => {
    const dates = [...progress.map((p) => p.completed_at), ...members.map((m) => m.created_at)]
    if (dates.length === 0) return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    return new Date(Math.min(...dates.map((d) => new Date(d).getTime())))
  }, [progress, members])

  const dateRange = useMemo(() => {
    if (customFrom && customTo) {
      return { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T23:59:59`) }
    }
    return resolveDateRange(preset, earliest)
  }, [preset, customFrom, customTo, earliest])

  // Curso escopa QUEM (módulos/aulas/membros relevantes) — não afetado pela data.
  const relevantModules = useMemo(
    () => (courseId === 'all' ? modules : modules.filter((m) => m.course_id === courseId)),
    [modules, courseId],
  )
  const relevantModuleIds = useMemo(() => new Set(relevantModules.map((m) => m.id)), [relevantModules])
  const relevantLessons = useMemo(() => lessons.filter((l) => relevantModuleIds.has(l.module_id)), [lessons, relevantModuleIds])
  const relevantLessonIds = useMemo(() => new Set(relevantLessons.map((l) => l.id)), [relevantLessons])
  const relevantMemberIds = useMemo(() => {
    if (courseId === 'all') return new Set(members.map((m) => m.id))
    return new Set(enrollments.filter((e) => e.course_id === courseId).map((e) => e.member_id))
  }, [courseId, members, enrollments])

  const lessonToModule = useMemo(() => new Map(lessons.map((l) => [l.id, l.module_id])), [lessons])

  // Progress escopado pelo curso (estado atual, sem filtro de data) — base do
  // Progresso por Módulo e da Distribuição de Engajamento.
  const scopedProgress = useMemo(
    () => progress.filter((p) => relevantLessonIds.has(p.lesson_id) && relevantMemberIds.has(p.user_id)),
    [progress, relevantLessonIds, relevantMemberIds],
  )

  // Data escopa QUANDO — aplicado só nos gráficos "ao longo do tempo" e "aulas
  // mais concluídas", nunca no progresso/engajamento (que é estado atual).
  const progressInRange = useMemo(() => {
    const from = dateRange.from.getTime(), to = dateRange.to.getTime()
    return scopedProgress.filter((p) => {
      const t = new Date(p.completed_at).getTime()
      return t >= from && t <= to
    })
  }, [scopedProgress, dateRange])

  // Novos membros é crescimento da plataforma — não é escopado por curso.
  const membersInRange = useMemo(() => {
    const from = dateRange.from.getTime(), to = dateRange.to.getTime()
    return members.filter((m) => {
      const t = new Date(m.created_at).getTime()
      return t >= from && t <= to
    })
  }, [members, dateRange])

  const granularity = useMemo(() => pickGranularity(dateRange.from, dateRange.to), [dateRange])
  const buckets = useMemo(() => buildBuckets(dateRange.from, dateRange.to, granularity), [dateRange, granularity])

  const completionsSeries = useMemo(
    () => countInBuckets(progressInRange.map((p) => new Date(p.completed_at)), buckets),
    [progressInRange, buckets],
  )
  const newMembersSeries = useMemo(
    () => countInBuckets(membersInRange.map((m) => new Date(m.created_at)), buckets),
    [membersInRange, buckets],
  )

  const moduleStats = useMemo(() => {
    const lessonCountByModule = new Map<string, number>()
    for (const l of relevantLessons) {
      lessonCountByModule.set(l.module_id, (lessonCountByModule.get(l.module_id) ?? 0) + 1)
    }
    const completedByModule = new Map<string, number>()
    for (const p of scopedProgress) {
      const modId = lessonToModule.get(p.lesson_id)
      if (modId) completedByModule.set(modId, (completedByModule.get(modId) ?? 0) + 1)
    }
    return relevantModules
      .map((mod) => {
        const lessonCount = lessonCountByModule.get(mod.id) ?? 0
        const possible = lessonCount * relevantMemberIds.size
        const completed = completedByModule.get(mod.id) ?? 0
        return { name: mod.title, total: possible > 0 ? Math.round((completed / possible) * 100) : 0 }
      })
      .sort((a, b) => b.total - a.total)
  }, [relevantModules, relevantLessons, scopedProgress, lessonToModule, relevantMemberIds])

  const topLessons = useMemo(() => {
    const completedByLesson = new Map<string, number>()
    for (const p of progressInRange) {
      completedByLesson.set(p.lesson_id, (completedByLesson.get(p.lesson_id) ?? 0) + 1)
    }
    return relevantLessons
      .map((l) => ({ name: l.title, total: completedByLesson.get(l.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
      .filter((l) => l.total > 0)
      .slice(0, 8)
  }, [relevantLessons, progressInRange])

  const engagementData = useMemo(() => {
    const completedByMember = new Map<string, number>()
    for (const p of scopedProgress) {
      completedByMember.set(p.user_id, (completedByMember.get(p.user_id) ?? 0) + 1)
    }
    const totalLessons = relevantLessonIds.size
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0
    for (const id of relevantMemberIds) {
      const completed = completedByMember.get(id) ?? 0
      const pct = totalLessons > 0 ? (completed / totalLessons) * 100 : 0
      if (pct === 0) b0++
      else if (pct <= 50) b1++
      else if (pct < 100) b2++
      else b3++
    }
    return [
      { name: 'Sem início', value: b0, color: '#94a3b8' },
      { name: '1% – 50%', value: b1, color: '#fb923c' },
      { name: '51% – 99%', value: b2, color: '#3b82f6' },
      { name: '100%', value: b3, color: '#22c55e' },
    ]
  }, [scopedProgress, relevantLessonIds, relevantMemberIds])

  const avgCompletionPct = relevantLessonIds.size > 0 && relevantMemberIds.size > 0
    ? Math.round((scopedProgress.length / (relevantLessonIds.size * relevantMemberIds.size)) * 100)
    : 0

  return (
    <div className="space-y-5">

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Todos os cursos</option>
          {sortedCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex gap-1 flex-wrap">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPreset(p); setCustomFrom(''); setCustomTo('') }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                preset === p && !customFrom && !customTo
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={cn('text-xs border rounded-lg px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary',
              customFrom ? 'border-primary text-primary font-medium' : 'border-border text-muted-foreground')}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className={cn('text-xs border rounded-lg px-2 py-1.5 bg-card focus:outline-none focus:ring-1 focus:ring-primary',
              customTo ? 'border-primary text-primary font-medium' : 'border-border text-muted-foreground')}
          />
          {(customFrom || customTo) && (
            <button
              type="button"
              onClick={() => { setCustomFrom(''); setCustomTo('') }}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              title="Limpar período customizado"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CheckCircle2} label="Conclusões no período" value={progressInRange.length} color="bg-blue-500/10 text-blue-500" />
        <KpiCard icon={UserPlus} label="Novos membros no período" value={membersInRange.length} color="bg-green-500/10 text-green-500" />
        <KpiCard icon={TrendingUp} label="Taxa média de conclusão" value={`${avgCompletionPct}%`} sub={courseId === 'all' ? 'todos os cursos' : 'curso selecionado'} color="bg-primary/10 text-primary" />
        <KpiCard icon={Users} label="Alunos considerados" value={relevantMemberIds.size} sub={courseId === 'all' ? 'membros ativos' : 'matriculados no curso'} color="bg-orange-500/10 text-orange-500" />
      </div>

      {/* ── Séries temporais ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Conclusões ao Longo do Tempo</h3>
          <p className="text-xs text-muted-foreground mb-4">Aulas concluídas no período selecionado</p>
          <CompletionsAreaChart data={completionsSeries} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Novos Membros ao Longo do Tempo</h3>
          <p className="text-xs text-muted-foreground mb-4">Cadastros na plataforma (não é escopado por curso)</p>
          <NewMembersLineChart data={newMembersSeries} />
        </div>
      </div>

      {/* ── Progresso por módulo / Aulas mais concluídas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Progresso por Módulo</h3>
          <p className="text-xs text-muted-foreground mb-4">% médio de conclusão (estado atual, não afetado pela data)</p>
          <HorizontalBarChart data={moduleStats} fill="#3b82f6" label="% concluído" emptyText="Nenhum módulo nesse curso ainda." />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Aulas Mais Concluídas</h3>
          <p className="text-xs text-muted-foreground mb-4">Nº de conclusões no período selecionado</p>
          <HorizontalBarChart data={topLessons} fill="#a855f7" label="Conclusões" emptyText="Nenhuma conclusão nesse período." />
        </div>
      </div>

      {/* ── Engajamento ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Distribuição de Engajamento</h3>
        <p className="text-xs text-muted-foreground mb-4">Alunos segmentados por % de conclusão (estado atual)</p>
        <EngagementDonut data={engagementData} />
      </div>
    </div>
  )
}
