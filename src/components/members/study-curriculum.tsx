'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CurriculumLesson = {
  id: string
  title: string
  isCompleted: boolean
}

export type CurriculumModule = {
  id: string
  title: string
  lessons: CurriculumLesson[]
}

type Props = {
  modules: CurriculumModule[]
  currentLessonId: string
  isOpen: boolean
  onClose: () => void
}

const isModuleDone = (m: CurriculumModule) =>
  m.lessons.length > 0 && m.lessons.every((l) => l.isCompleted)

// Módulo concluído fica fechado; abre o da aula atual e, quando esse também
// já terminou, o próximo que ainda tem aula pendente.
function defaultExpanded(modules: CurriculumModule[], currentLessonId: string): Set<string> {
  const current = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))
  const open = new Set<string>()

  if (current && !isModuleDone(current)) open.add(current.id)

  if (!current || isModuleDone(current)) {
    const startAt = current ? modules.indexOf(current) + 1 : 0
    const next = modules.slice(startAt).find((m) => !isModuleDone(m))
      ?? modules.find((m) => !isModuleDone(m))
    if (next) open.add(next.id)
    // Curso inteiro concluído: mantém o módulo da aula atual visível para não
    // deixar a lista toda fechada.
    else if (current) open.add(current.id)
  }

  return open
}

export function StudyCurriculum({ modules, currentLessonId, isOpen, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded(modules, currentLessonId))

  // Recalcula ao trocar de aula (inclusive quando a conclusão de uma aula
  // fecha o módulo e abre o seguinte). Toggle manual do usuário vale até a
  // próxima navegação.
  useEffect(() => {
    setExpanded(defaultExpanded(modules, currentLessonId))
  }, [currentLessonId, modules])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)
  const doneLessons = modules.reduce((s, m) => s + m.lessons.filter((l) => l.isCompleted).length, 0)

  if (!isOpen) return null

  return (
    <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">Conteúdo do curso</p>
          <p className="text-xs text-muted-foreground mt-0.5">{doneLessons}/{totalLessons} aulas concluídas</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border shrink-0">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Modules */}
      <div className="flex-1 overflow-y-auto">
        {modules.map((mod) => {
          const isExpanded = expanded.has(mod.id)
          const modDone = mod.lessons.filter((l) => l.isCompleted).length
          const done = isModuleDone(mod)
          return (
            <div key={mod.id} className="border-b border-border/50 last:border-0">
              <button
                onClick={() => toggle(mod.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors',
                  done ? 'bg-green-500/[0.07] hover:bg-green-500/[0.12]' : 'hover:bg-muted/40'
                )}
              >
                <div className="min-w-0 flex items-start gap-2">
                  {done && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      done ? 'text-green-700 dark:text-green-500' : 'text-foreground'
                    )}>
                      {mod.title}
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      done ? 'text-green-600/80 font-medium' : 'text-muted-foreground'
                    )}>
                      {done ? `Módulo concluído · ${mod.lessons.length}/${mod.lessons.length}` : `${modDone}/${mod.lessons.length}`}
                    </p>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronDown className={cn('w-4 h-4 shrink-0', done ? 'text-green-600/70' : 'text-muted-foreground')} />
                  : <ChevronRight className={cn('w-4 h-4 shrink-0', done ? 'text-green-600/70' : 'text-muted-foreground')} />}
              </button>

              {isExpanded && (
                <div className="bg-muted/20">
                  {mod.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId
                    return (
                      <Link
                        key={lesson.id}
                        href={`/dashboard/aulas/${lesson.id}`}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 transition-colors border-l-2',
                          isCurrent
                            ? 'bg-primary/10 border-primary'
                            : 'border-transparent hover:bg-muted/60'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {lesson.isCompleted
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <Circle className={cn('w-4 h-4', isCurrent ? 'text-primary' : 'text-muted-foreground')} />}
                        </div>
                        <span className={cn(
                          'text-xs leading-snug',
                          isCurrent ? 'text-primary font-medium' : 'text-foreground'
                        )}>
                          {lesson.title}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
