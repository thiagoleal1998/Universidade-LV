'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users, BookOpen, GraduationCap, TrendingUp, TrendingDown, Minus,
  Activity, BarChart3, Lightbulb, Settings, Megaphone, MessageSquare,
  ArrowUpRight, Trophy, AlertTriangle, CheckCircle2, UserPlus, Eye,
  LayoutDashboard, Presentation, FileText, ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardCharts } from '@/components/admin/dashboard-charts'

export type ModuleStat = { id: string; title: string; pct: number; lessonCount: number; completions: number }
export type LessonWithCount = { id: string; title: string; moduleTitle: string; completions: number }
export type MemberStat = { id: string; name: string; completed: number; pct: number }
export type PendingLesson = { lessonId: string; lessonTitle: string; taskTitle: string; count: number }

export type RecentActivityItem = {
  completed_at: string
  lessonTitle: string | null
  moduleTitle: string | null
  memberName: string | null
}

export type SignupRow = { id: string; name: string; created_at: string }

export type OnlineByRole = { member: number; collaborator: number; admin: number }

export type EngagementBucket = {
  label: string; value: number; color: string; valueColor: string
}

export type DashboardProps = {
  totalModules: number
  totalLessons: number
  totalMembersActive: number
  totalMembersAll: number
  overallRate: number
  totalCompletions: number
  completionsThisWeek: number
  completionsPrevWeek: number
  newMembersThisWeek: number
  newMembersPrevWeek: number
  moduleStats: ModuleStat[]
  lessonsWithCount: LessonWithCount[]
  memberStats: MemberStat[]
  recentActivity: RecentActivityItem[]
  newSignups: SignupRow[]
  engagementBuckets: EngagementBucket[]
  pendingLessons: PendingLesson[]
  onlineByRole: OnlineByRole
  courses: { id: string; name: string }[]
  modulesRaw: { id: string; title: string; course_id: string | null }[]
  lessonsRaw: { id: string; title: string; module_id: string }[]
  progressRaw: { lesson_id: string; user_id: string; completed_at: string }[]
  membersRaw: { id: string; full_name: string; created_at: string }[]
  enrollments: { member_id: string; course_id: string }[]
  // Papel efetivo (considera o modo prévia) — só rótulo. isRealAdmin controla
  // se o controle de entrar/sair da prévia aparece (colaborador de verdade nunca vê).
  role?: 'admin' | 'collaborator'
  isRealAdmin?: boolean
  previewActive?: boolean
  previewAreaId?: string | null
  collaboratorAreas?: { id: string; name: string }[]
}

type TrendDir = 'up' | 'down' | 'flat'
function trend(current: number, prev: number): { dir: TrendDir; pct: number } | null {
  if (prev === 0 && current === 0) return null
  if (prev === 0) return { dir: 'up', pct: 100 }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', pct: Math.abs(pct) }
}

function TrendBadge({ t, light = false }: { t: { dir: TrendDir; pct: number } | null; light?: boolean }) {
  if (!t) return null
  const up = t.dir === 'up'
  const flat = t.dir === 'flat'
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-semibold',
      light
        ? up ? 'text-green-300' : flat ? 'text-white/50' : 'text-red-300'
        : up ? 'text-green-600 dark:text-green-400' : flat ? 'text-muted-foreground' : 'text-red-500'
    )}>
      {up ? <TrendingUp className="w-3 h-3" /> : flat ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {t.pct}% vs semana ant.
    </span>
  )
}

function HBar({ pct, color = 'bg-primary' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

const QUICK_LINKS = [
  { href: '/admin/membros',       icon: Users,         label: 'Membros'       },
  { href: '/admin/cursos',        icon: BookOpen,      label: 'Cursos'        },
  { href: '/admin/comunicados',   icon: Megaphone,     label: 'Comunicados'   },
  { href: '/admin/marketing',     icon: Presentation,  label: 'Marketing'     },
  { href: '/admin/comunidade',    icon: MessageSquare, label: 'Comunidade'    },
  { href: '/admin/configuracoes', icon: Settings,      label: 'Config.'       },
]

const TABS = [
  { id: 'overview', label: 'Visão Geral',  icon: LayoutDashboard },
  { id: 'charts',   label: 'Gráficos',    icon: BarChart3        },
  { id: 'insights', label: 'Insights',    icon: Lightbulb        },
]

export function AdminDashboardShell(props: DashboardProps) {
  const [tab, setTab] = useState<'overview' | 'charts' | 'insights'>('overview')
  const role = props.role ?? 'admin'
  const previewActive = props.previewActive ?? false
  const collaboratorAreas = props.collaboratorAreas ?? []
  const previewAreaName = collaboratorAreas.find((a) => a.id === props.previewAreaId)?.name ?? null

  // Ativar/sair da prévia é navegação de verdade (GET em /api/admin/preview,
  // não Server Action) — de propósito, pra abrir em aba nova sem mexer na
  // aba atual (ver comentário em src/app/api/admin/preview/route.ts).
  function activatePreview(areaId: string) {
    window.open(`/api/admin/preview?area=${areaId}`, '_blank', 'noopener,noreferrer')
  }

  function exitPreview() {
    window.location.href = '/api/admin/preview'
  }

  const ct = trend(props.completionsThisWeek, props.completionsPrevWeek)
  const mt = trend(props.newMembersThisWeek, props.newMembersPrevWeek)
  const topLessons = props.lessonsWithCount.slice(0, 8)
  const bottomLessons = [...props.lessonsWithCount].sort((a, b) => a.completions - b.completions).slice(0, 5)
  const topMembers = props.memberStats.slice(0, 5)
  const inactiveMembers = props.memberStats.filter((m) => m.completed === 0)
  const total = props.memberStats.length || 1

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_272px] gap-6 items-start">

        {/* ── Coluna principal ── */}
        <div className="min-w-0 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-2">
                <LayoutDashboard className="w-3 h-3" /> {role === 'admin' ? 'Painel Admin' : 'Painel do Colaborador'}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
                Gerenciando seus{' '}
                <span className="text-primary">Alunos</span>{' '}
                e Conteúdo
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe o progresso e o engajamento da plataforma.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              {props.isRealAdmin && (
                previewActive ? (
                  <button
                    type="button"
                    onClick={exitPreview}
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 px-4 py-2.5 rounded-xl hover:bg-violet-500/20 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> {`Sair da prévia${previewAreaName ? ` (${previewAreaName})` : ''}`}
                  </button>
                ) : (
                  <div className="relative">
                    <select
                      value=""
                      disabled={collaboratorAreas.length === 0}
                      onChange={(e) => { if (e.target.value) activatePreview(e.target.value) }}
                      className="appearance-none inline-flex items-center gap-2 text-sm font-semibold border border-border pl-10 pr-4 py-2.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 bg-background cursor-pointer"
                    >
                      <option value="" disabled>
                        {collaboratorAreas.length === 0 ? 'Nenhuma área criada' : 'Prévia como Colaborador...'}
                      </option>
                      {collaboratorAreas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <Eye className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )
              )}
              <Link
                href="/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold bg-foreground text-background px-4 py-2.5 rounded-xl hover:opacity-85 transition-opacity"
              >
                Área do Aluno <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Banner tarefas pendentes */}
          {props.pendingLessons.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
              <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                <span className="font-semibold">
                  {props.pendingLessons.reduce((s, l) => s + l.count, 0)} tarefa{props.pendingLessons.reduce((s, l) => s + l.count, 0) !== 1 ? 's' : ''} aguardando correção
                </span>
                {' '}— veja no painel ao lado para corrigir.
              </p>
            </div>
          )}

          {/* Tab nav — pill style */}
          <div className="flex gap-1 p-1 bg-muted/60 rounded-xl w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as typeof tab)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all',
                  tab === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── VISÃO GERAL ── */}
          {tab === 'overview' && (
            <div className="space-y-5">

              {/* Hero stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Online agora */}
                <div className="rounded-2xl border border-border bg-card p-6 relative overflow-hidden">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                      <Activity className="w-4.5 h-4.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Online agora</span>
                    <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-5xl font-bold text-foreground tracking-tight mb-1">
                    {props.onlineByRole.member + props.onlineByRole.collaborator + props.onlineByRole.admin}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {props.onlineByRole.member} alunos · {props.onlineByRole.collaborator} colaboradores · {props.onlineByRole.admin} admins
                  </p>
                </div>

                {/* Membros */}
                <div className="rounded-2xl border border-border bg-card p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                        <Users className="w-4.5 h-4.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Membros</span>
                    </div>
                    <TrendBadge t={mt} />
                  </div>
                  <p className="text-5xl font-bold text-foreground tracking-tight mb-1">
                    {props.totalMembersAll}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {props.totalMembersActive} ativos · +{props.newMembersThisWeek} esta semana
                  </p>
                  {/* Mini segment bars */}
                  <div className="mt-5 flex items-end gap-1 h-12">
                    {props.engagementBuckets.map((b, i) => (
                      <div
                        key={i}
                        className={cn('flex-1 rounded-full transition-all duration-700', b.color)}
                        style={{ height: `${total > 0 ? Math.max((b.value / total) * 100, 4) : 4}%`, minHeight: '4px', maxHeight: '100%' }}
                        title={`${b.label}: ${b.value}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {props.engagementBuckets.map((b) => (
                      <span key={b.label} className="text-[9px] text-muted-foreground/60 flex-1 text-center truncate">{b.label}</span>
                    ))}
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-muted/30 pointer-events-none" />
                </div>

                {/* Conclusões — highlighted */}
                <div className="rounded-2xl bg-primary p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
                        <CheckCircle2 className="w-4.5 h-4.5 text-primary-foreground" />
                      </div>
                      <span className="text-sm font-medium text-primary-foreground/80">Conclusões</span>
                    </div>
                    <TrendBadge t={ct} light />
                  </div>
                  <p className="text-5xl font-bold text-primary-foreground tracking-tight mb-1">
                    {props.completionsThisWeek}
                  </p>
                  <p className="text-xs text-primary-foreground/70">
                    esta semana · {props.totalCompletions} no total
                  </p>
                  {/* Decorative blobs */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary-foreground/5 pointer-events-none" />
                  <div className="absolute right-8 bottom-10 w-20 h-20 rounded-full bg-primary-foreground/5 pointer-events-none" />
                  {/* Rate display */}
                  <div className="mt-5 flex items-end gap-2">
                    <span className="text-3xl font-bold text-primary-foreground">{props.overallRate}<span className="text-xl">%</span></span>
                    <span className="text-xs text-primary-foreground/70 mb-1">taxa geral de conclusão</span>
                  </div>
                </div>
              </div>

              {/* Module progress — vertical pill bars */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Progresso por Módulo</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">% médio de conclusão dos membros</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground inline-block" /> Módulos</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Destaque</span>
                  </div>
                </div>

                {props.moduleStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">Nenhum módulo publicado ainda.</p>
                ) : (
                  <div className="flex items-end gap-3 overflow-x-auto pb-1" style={{ minHeight: 160 }}>
                    {props.moduleStats.map((mod, i) => {
                      const barH = Math.max(mod.pct, 5)
                      const isAccent = i % 2 !== 0
                      return (
                        <div key={mod.id} className="flex flex-col items-center gap-2 min-w-[52px] flex-1 max-w-[80px]">
                          <span className="text-xs font-bold text-foreground tabular-nums">{mod.pct}%</span>
                          <div className="relative w-10 rounded-full overflow-hidden" style={{ height: 120, background: 'hsl(var(--muted))' }}>
                            <div
                              className={cn('absolute bottom-0 inset-x-0 rounded-full transition-all duration-700',
                                isAccent ? 'bg-primary' : 'bg-foreground')}
                              style={{ height: `${barH}%` }}
                            />
                            <div
                              className="absolute w-5 h-5 rounded-full bg-card border-2 border-border left-1/2 -translate-x-1/2 shadow-sm"
                              style={{ bottom: `calc(${barH}% - 10px)` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground text-center w-full truncate leading-tight px-0.5">
                            {mod.title.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent completions */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Atividade Recente</h3>
                </div>
                {props.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conclusão ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {props.recentActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            <span className="font-medium">{a.memberName || 'Membro'}</span>
                            <span className="text-muted-foreground"> concluiu </span>
                            <span>{a.lessonTitle}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.moduleTitle && `${a.moduleTitle} · `}
                            {new Date(a.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── GRÁFICOS ── */}
          {tab === 'charts' && (
            <DashboardCharts
              courses={props.courses}
              modules={props.modulesRaw}
              lessons={props.lessonsRaw}
              progress={props.progressRaw}
              members={props.membersRaw}
              enrollments={props.enrollments}
            />
          )}

          {/* ── INSIGHTS ── */}
          {tab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Conteúdo em destaque */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-semibold text-foreground">Conteúdo em Destaque</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Aulas com mais conclusões — o que está funcionando</p>
                {topLessons.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conclusão ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {topLessons.slice(0, 5).map((l, i) => (
                      <div key={l.id} className="flex items-start gap-3">
                        <span className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                          i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : i === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-muted text-muted-foreground'
                        )}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{l.title}</p>
                          <p className="text-xs text-muted-foreground">{l.moduleTitle} · {l.completions} conclusões</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Oportunidades de melhoria */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-foreground">Oportunidades de Melhoria</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Aulas menos concluídas — considere revisar</p>
                {bottomLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Dados insuficientes.</p>
                ) : (
                  <div className="space-y-3">
                    {bottomLessons.map((l) => (
                      <div key={l.id} className="flex items-start gap-3">
                        <div className="shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{l.title}</p>
                          <p className="text-xs text-muted-foreground">{l.moduleTitle} · {l.completions} conclus{l.completions === 1 ? 'ão' : 'ões'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Membros mais engajados */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-foreground">Membros Mais Engajados</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Alunos com mais aulas concluídas</p>
                {topMembers.filter((m) => m.completed > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro com progresso ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {topMembers.filter((m) => m.completed > 0).map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <HBar pct={m.pct} color="bg-blue-500" />
                            <span className="text-xs text-muted-foreground tabular-nums">{m.pct}%</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">{m.completed} aula{m.completed !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Membros sem progresso */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Membros Sem Progresso</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Ainda não iniciaram nenhuma aula</p>
                {inactiveMembers.length === 0 ? (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Todos os membros já iniciaram o conteúdo.</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {inactiveMembers.length} de {props.memberStats.length} membros ({total > 0 ? Math.round((inactiveMembers.length / total) * 100) : 0}%) sem início
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {inactiveMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="text-sm text-muted-foreground truncate">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Painel lateral direito ── */}
        <div className="space-y-4">

          {/* Tarefas pendentes de correção */}
          {props.pendingLessons.length > 0 && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-tight">Aguardando Correção</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">
                    {props.pendingLessons.reduce((s, l) => s + l.count, 0)} resposta{props.pendingLessons.reduce((s, l) => s + l.count, 0) !== 1 ? 's' : ''} pendente{props.pendingLessons.reduce((s, l) => s + l.count, 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {props.pendingLessons.map((p) => (
                  <Link
                    key={p.lessonId}
                    href={`/admin/aulas/${p.lessonId}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-100 transition-colors">
                        {p.lessonTitle}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 truncate">{p.taskTitle}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-200 dark:bg-amber-800/60 px-2 py-0.5 rounded-full tabular-nums">
                      {p.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Acesso rápido */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LINKS.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-center"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Resumo numérico */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo</p>
            <div className="space-y-3">
              {[
                { label: 'Módulos',           value: props.totalModules,   icon: FileText    },
                { label: 'Aulas publicadas',  value: props.totalLessons,   icon: GraduationCap },
                { label: 'Taxa de conclusão', value: `${props.overallRate}%`, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Novos membros */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Novos Membros</h3>
            </div>
            {props.newSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Nenhum cadastro recente.</p>
            ) : (
              <div className="space-y-3">
                {props.newSignups.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{(m.name || '?')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.name || 'Sem nome'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
