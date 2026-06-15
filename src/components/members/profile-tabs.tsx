'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  User, BarChart2, Award, History,
  CheckCircle2, Clock, Trophy, Download, BookOpen, ChevronDown, ChevronRight, PlayCircle,
} from 'lucide-react'
import { ProfileFormCompact } from '@/components/members/profile-form-compact'

type ModuleProgress = { id: string; title: string; total: number; done: number }
type CourseProgress = { id: string; name: string; total: number; done: number; modules: ModuleProgress[] }
type Certificate = { id: string; moduleId: string; moduleTitle: string; status: 'internal' | 'approved'; issuedAt: string }
type PendingModule = { id: string; title: string; total: number; done: number; courseName: string }
type ActivityItem = { lessonId: string; lessonTitle: string; completedAt: string }

type Props = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string
  memberSince: string
  courseProgress: CourseProgress[]
  certificates: Certificate[]
  pendingModules: PendingModule[]
  activityHistory?: ActivityItem[]
}

const TABS = [
  { id: 'perfil', label: 'Meu Perfil', icon: User },
  { id: 'desempenho', label: 'Desempenho', icon: BarChart2 },
  { id: 'certificados', label: 'Certificados', icon: Award },
  { id: 'historico', label: 'Histórico', icon: History },
] as const

type TabId = typeof TABS[number]['id']

export function ProfileTabs(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('perfil')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Minha Conta</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil, acompanhe seu progresso e baixe seus certificados.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil'       && <PerfilTab {...props} />}
      {activeTab === 'desempenho'   && <DesempenhoTab courseProgress={props.courseProgress} memberSince={props.memberSince} />}
      {activeTab === 'certificados' && <CertificadosTab certificates={props.certificates} pendingModules={props.pendingModules} />}
      {activeTab === 'historico'    && <HistoricoTab items={props.activityHistory ?? []} />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Tab 1: Perfil
───────────────────────────────────────────────────────── */

function PerfilTab({ userId, fullName, email, avatarUrl }: Props) {
  return <ProfileFormCompact userId={userId} fullName={fullName} email={email} avatarUrl={avatarUrl} />
}

/* ─────────────────────────────────────────────────────────
   Tab 2: Desempenho
───────────────────────────────────────────────────────── */

function DesempenhoTab({ courseProgress, memberSince }: { courseProgress: CourseProgress[]; memberSince: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalLessons = courseProgress.reduce((s, c) => s + c.total, 0)
  const doneLessons  = courseProgress.reduce((s, c) => s + c.done, 0)
  const overallPct   = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  if (courseProgress.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Nenhum curso disponível ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Progresso geral</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-foreground">{overallPct}%</span>
            <span className="text-sm text-muted-foreground mb-1">{doneLessons}/{totalLessons} aulas</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
        <div className="flex sm:flex-col gap-4 sm:gap-2 sm:text-right shrink-0">
          <div>
            <p className="text-xs text-muted-foreground">Cursos</p>
            <p className="text-lg font-semibold text-foreground">{courseProgress.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Membro desde</p>
            <p className="text-sm font-medium text-foreground">
              {memberSince
                ? new Date(memberSince).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Per-course breakdown */}
      {courseProgress.map((course) => {
        const pct = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0
        const isExpanded = expanded.has(course.id)

        return (
          <div key={course.id} className="bg-card border rounded-xl overflow-hidden">
            <button
              className="w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              onClick={() => toggle(course.id)}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-semibold text-foreground">{course.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{course.done}/{course.total} aulas</span>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded-full',
                    pct === 100
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {pct}%
                  </span>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-primary')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>

            {isExpanded && course.modules.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                {course.modules.map((mod) => {
                  const mp = mod.total > 0 ? Math.round((mod.done / mod.total) * 100) : 0
                  return (
                    <div key={mod.id} className="px-5 py-3 flex items-center gap-3">
                      {mod.done === mod.total && mod.total > 0
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />}
                      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{mod.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{mod.done}/{mod.total}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                        <div
                          className={cn('h-full rounded-full', mp === 100 ? 'bg-green-500' : 'bg-primary')}
                          style={{ width: `${mp}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Tab 3: Certificados
───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   Tab 4: Histórico
───────────────────────────────────────────────────────── */

function HistoricoTab({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Nenhuma atividade registrada ainda.</p>
        <p className="text-sm text-muted-foreground mt-1">Conclua aulas para ver seu histórico aqui.</p>
      </div>
    )
  }

  // Group by day
  const byDay = items.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const day = item.completedAt.slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {})

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a))

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    if (dateStr === today) return 'Hoje'
    if (dateStr === yesterday) return 'Ontem'
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function formatTime(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{items.length} aulas concluídas nos últimos registros.</p>
      {sortedDays.map((day) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide capitalize">
              {formatDay(day)}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{byDay[day].length} aula{byDay[day].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {byDay[day].map((item) => (
              <div key={item.lessonId + item.completedAt} className="flex items-center gap-3 px-4 py-2.5 bg-card border rounded-xl">
                <div className="w-7 h-7 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 flex items-center justify-center shrink-0">
                  <PlayCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.lessonTitle || 'Aula concluída'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatTime(item.completedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Tab 3: Certificados (original)
───────────────────────────────────────────────────────── */

function CertificadosTab({ certificates, pendingModules }: { certificates: Certificate[]; pendingModules: PendingModule[] }) {
  const approved = certificates.filter((c) => c.status === 'approved')
  const inReview = certificates.filter((c) => c.status === 'internal')

  const hasAny = approved.length > 0 || inReview.length > 0 || pendingModules.length > 0

  if (!hasAny) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Nenhum certificado ainda.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Complete os módulos dos cursos para ganhar certificados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Conquistados */}
      {approved.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Conquistados ({approved.length})
          </h3>
          <div className="space-y-2">
            {approved.map((cert) => (
              <div key={cert.id} className="bg-card border rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{cert.moduleTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emitido em {new Date(cert.issuedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <a
                  href={`/print/certificado/${cert.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Em análise */}
      {inReview.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Em análise ({inReview.length})
          </h3>
          <div className="space-y-2">
            {inReview.map((cert) => (
              <div key={cert.id} className="bg-card border rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{cert.moduleTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aguardando aprovação</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">Em análise</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pendentes (module complete, no cert issued) */}
      {pendingModules.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Módulos concluídos ({pendingModules.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Você concluiu estes módulos. O certificado será emitido após revisão da equipe.
          </p>
          <div className="space-y-2">
            {pendingModules.map((mod) => (
              <div key={mod.id} className="bg-card border border-dashed rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{mod.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.courseName} · {mod.done}/{mod.total} aulas</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Aguardando emissão</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
