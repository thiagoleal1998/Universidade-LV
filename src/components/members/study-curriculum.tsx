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

export function StudyCurriculum({ modules, currentLessonId, isOpen, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const currentModule = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))
    return new Set(currentModule ? [currentModule.id] : modules.slice(0, 1).map((m) => m.id))
  })

  useEffect(() => {
    const currentModule = modules.find((m) => m.lessons.some((l) => l.id === currentLessonId))
    if (currentModule) {
      setExpanded((prev) => new Set([...prev, currentModule.id]))
    }
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
          return (
            <div key={mod.id} className="border-b border-border/50 last:border-0">
              <button
                onClick={() => toggle(mod.id)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{mod.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{modDone}/{mod.lessons.length}</p>
                </div>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
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
