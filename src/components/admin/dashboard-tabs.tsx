'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Lightbulb, Trophy, AlertTriangle, Users, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ModuleStat = {
  id: string
  title: string
  pct: number
  lessonCount: number
  completions: number
}

export type LessonWithCount = {
  id: string
  title: string
  moduleTitle: string
  completions: number
}

export type MemberStat = {
  id: string
  name: string
  completed: number
  pct: number
}

interface Props {
  moduleStats: ModuleStat[]
  lessonsWithCount: LessonWithCount[]
  memberStats: MemberStat[]
  totalLessons: number
  totalMembers: number
}

const TABS = [
  { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
]

function Bar({ pct, color = 'bg-primary' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export function DashboardTabs({
  moduleStats,
  lessonsWithCount,
  memberStats,
  totalLessons,
  totalMembers,
}: Props) {
  const [activeTab, setActiveTab] = useState<'graficos' | 'insights'>('graficos')

  const topLessons = lessonsWithCount.slice(0, 8)
  const bottomLessons = [...lessonsWithCount]
    .sort((a, b) => a.completions - b.completions)
    .slice(0, 5)
  const topMembers = memberStats.slice(0, 5)
  const inactiveMembers = memberStats.filter((m) => m.completed === 0)

  const total = memberStats.length || 1
  const bucket0 = memberStats.filter((m) => m.pct === 0).length
  const bucket1_50 = memberStats.filter((m) => m.pct > 0 && m.pct <= 50).length
  const bucket51_99 = memberStats.filter((m) => m.pct > 50 && m.pct < 100).length
  const bucket100 = memberStats.filter((m) => m.pct === 100).length

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as 'graficos' | 'insights')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── GRÁFICOS ── */}
      {activeTab === 'graficos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progresso por Módulo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Progresso por Módulo</CardTitle>
              <p className="text-xs text-muted-foreground">% médio de conclusão dos membros</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {moduleStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum módulo publicado ainda.</p>
              ) : (
                moduleStats.map((mod) => (
                  <div key={mod.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-foreground font-medium truncate max-w-[200px]">{mod.title}</span>
                      <span className="text-muted-foreground ml-2 tabular-nums">{mod.pct}%</span>
                    </div>
                    <Bar pct={mod.pct} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Aulas mais concluídas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Aulas Mais Concluídas</CardTitle>
              <p className="text-xs text-muted-foreground">Número de membros que concluíram cada aula</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {topLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conclusão registrada ainda.</p>
              ) : (
                topLessons.map((lesson, i) => (
                  <div key={lesson.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4 tabular-nums">{i + 1}.</span>
                      <span className="text-foreground font-medium flex-1 truncate">{lesson.title}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {lesson.completions}/{totalMembers}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Bar pct={totalMembers > 0 ? (lesson.completions / totalMembers) * 100 : 0} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Distribuição de engajamento */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Distribuição de Engajamento</CardTitle>
              <p className="text-xs text-muted-foreground">Membros segmentados por nível de progresso</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Sem início',
                    value: bucket0,
                    barColor: 'bg-muted-foreground/40',
                    valueColor: 'text-muted-foreground',
                  },
                  {
                    label: '1% – 50%',
                    value: bucket1_50,
                    barColor: 'bg-orange-400',
                    valueColor: 'text-orange-500 dark:text-orange-400',
                  },
                  {
                    label: '51% – 99%',
                    value: bucket51_99,
                    barColor: 'bg-blue-500',
                    valueColor: 'text-blue-600 dark:text-blue-400',
                  },
                  {
                    label: '100% Concluído',
                    value: bucket100,
                    barColor: 'bg-green-500',
                    valueColor: 'text-green-600 dark:text-green-400',
                  },
                ].map(({ label, value, barColor, valueColor }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border"
                  >
                    <div className={cn('text-3xl font-bold tabular-nums', valueColor)}>{value}</div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${(value / total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
                    <p className="text-xs font-medium text-muted-foreground tabular-nums">
                      {total > 0 ? Math.round((value / total) * 100) : 0}% dos membros
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── INSIGHTS ── */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conteúdo em Destaque */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <CardTitle className="text-sm font-semibold">Conteúdo em Destaque</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Aulas com mais conclusões — o que está funcionando bem</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {topLessons.slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conclusão registrada ainda.</p>
              ) : (
                topLessons.slice(0, 5).map((lesson, i) => (
                  <div key={lesson.id} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                        i === 0
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : i === 1
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          : i === 2
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.moduleTitle} · {lesson.completions} conclusões
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Oportunidades de Melhoria */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <CardTitle className="text-sm font-semibold">Oportunidades de Melhoria</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Aulas menos concluídas — considere revisar o conteúdo</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {bottomLessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Dados insuficientes.</p>
              ) : (
                bottomLessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.moduleTitle} · apenas {lesson.completions} conclus{lesson.completions === 1 ? 'ão' : 'ões'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Membros mais engajados */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold">Membros Mais Engajados</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Alunos com mais aulas concluídas</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {topMembers.filter((m) => m.completed > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro com progresso ainda.</p>
              ) : (
                topMembers
                  .filter((m) => m.completed > 0)
                  .map((member, i) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Bar pct={member.pct} color="bg-blue-500" />
                          <span className="text-xs text-muted-foreground tabular-nums">{member.pct}%</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {member.completed} aula{member.completed !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Membros sem progresso */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Membros Sem Progresso</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Ainda não iniciaram nenhuma aula</p>
            </CardHeader>
            <CardContent>
              {inactiveMembers.length === 0 ? (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Todos os membros já iniciaram o conteúdo.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    {inactiveMembers.length} de {memberStats.length} membros (
                    {total > 0 ? Math.round((inactiveMembers.length / total) * 100) : 0}%) sem início
                  </p>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {inactiveMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
