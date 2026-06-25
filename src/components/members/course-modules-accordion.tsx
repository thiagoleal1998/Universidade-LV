'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ChevronRight, Lock, CalendarClock, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type LessonSummary = {
  id: string
  title: string
  is_published: boolean
  task_start_date: string | null
  task_end_date: string | null
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function TaskPeriodBadge({ start, end }: { start: string | null; end: string | null }) {
  if (!start && !end) return null

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const startDate = start ? new Date(start + 'T00:00:00') : null
  const endDate = end ? new Date(end + 'T00:00:00') : null

  if (startDate && today < startDate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
        <CalendarClock className="w-3 h-3 shrink-0" />
        Abre {formatDate(start!)}
      </span>
    )
  }
  if (endDate && today > endDate) {
    return (
      <span className="text-xs text-muted-foreground line-through">
        até {formatDate(end!)}
      </span>
    )
  }
  const daysLeft = endDate
    ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const urgent = daysLeft !== null && daysLeft <= 3

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs',
      urgent ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400',
    )}>
      <Clock className="w-3 h-3 shrink-0" />
      {end ? `até ${formatDate(end)}` : `desde ${formatDate(start!)}`}
      {daysLeft !== null && daysLeft <= 3 && (
        <span className="font-semibold">
          &nbsp;({daysLeft === 0 ? 'hoje' : `${daysLeft}d`})
        </span>
      )}
    </span>
  )
}
type ModuleItem = {
  id: string
  title: string
  description: string
  order_index: number
  prerequisite_module_id: string | null
  lessons: LessonSummary[]
}

type Props = {
  modules: ModuleItem[]
  completedIds: string[]
  completedModuleIds: string[]
  defaultOpenId?: string | null
  isAdmin?: boolean
}

export function CourseModulesAccordion({
  modules,
  completedIds,
  completedModuleIds,
  defaultOpenId,
  isAdmin = false,
}: Props) {
  const completedSet = new Set(completedIds)
  const completedModSet = new Set(completedModuleIds)

  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null)

  function toggle(id: string, isLocked: boolean) {
    if (isLocked) return
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-3">
      {modules.map((mod) => {
        const lessons = (mod.lessons ?? []).filter((l) => isAdmin || l.is_published)
        const done = lessons.filter((l) => completedSet.has(l.id)).length
        const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0

        const prereqId = mod.prerequisite_module_id
        const isLocked = !!prereqId && !completedModSet.has(prereqId)
        const prereqMod = prereqId ? modules.find((m) => m.id === prereqId) : null
        const isOpen = openId === mod.id && !isLocked

        return (
          <div
            key={mod.id}
            className={cn('bg-card border rounded-xl overflow-hidden', isLocked && 'opacity-60')}
          >
            {/* Header — clicável */}
            <button
              type="button"
              onClick={() => toggle(mod.id, isLocked)}
              disabled={isLocked}
              className={cn(
                'w-full text-left px-5 py-4 flex items-start gap-3 transition-colors',
                !isLocked && 'hover:bg-muted/40 cursor-pointer',
                isLocked && 'cursor-default',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={cn('font-semibold text-sm leading-snug', isLocked && 'text-muted-foreground')}>
                    {mod.title}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0 ml-1">{done}/{lessons.length}</Badge>
                </div>

                {isLocked ? (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Conclua <strong className="ml-1">{prereqMod?.title ?? 'o módulo anterior'}</strong>
                  </p>
                ) : (
                  <>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    )}
                    {lessons.length > 0 && (
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden w-full max-w-xs">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isLocked && (
                <span className="shrink-0 mt-0.5 text-muted-foreground">
                  <ChevronRight className={cn('w-4 h-4 transition-transform duration-300', isOpen && 'rotate-90')} />
                </span>
              )}
            </button>

            {/* Aulas — animação suave de abertura via grid-rows */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 300ms ease-in-out',
              }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border divide-y divide-border">
                  {lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/dashboard/aulas/${lesson.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {completedSet.has(lesson.id)
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                        }
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-green-600 block truncate">{lesson.title}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {isAdmin && !lesson.is_published && (
                              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400 py-0 shrink-0">
                                Rascunho
                              </Badge>
                            )}
                            <TaskPeriodBadge start={lesson.task_start_date} end={lesson.task_end_date} />
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ))}
                  {lessons.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhuma aula neste módulo ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {modules.length === 0 && (
        <p className="text-muted-foreground text-center py-10">
          Nenhum módulo disponível neste curso ainda.
        </p>
      )}
    </div>
  )
}
