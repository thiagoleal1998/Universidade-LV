'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Info, ArrowRight, CheckCircle2, Circle, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LessonSummary = { id: string; is_published: boolean }
type ModuleSummary = { id: string; title: string; lessons: LessonSummary[] }

export type CourseCard = {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
  instructor_name: string | null
  instructor_role: string | null
  instructor_photo_url: string | null
  modules: ModuleSummary[]
}

type CourseProgress = { total: number; done: number; pct: number }

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : 'hsl(var(--primary))' }}
      />
    </div>
  )
}

function CourseDetailDialog({
  course,
  progress,
  completedSet,
  open,
  onClose,
}: {
  course: CourseCard
  progress: CourseProgress
  completedSet: Set<string>
  open: boolean
  onClose: () => void
}) {
  const { total, done, pct } = progress
  const modCount = course.modules.length

  const ctaLabel = pct === 0 ? 'Começar curso' : pct === 100 ? 'Revisar curso' : 'Continuar curso'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden rounded-2xl max-w-[380px] w-[calc(100vw-2rem)]">

        {/* Cover — compact fixed height */}
        {course.cover_image_url ? (
          <div className="h-44 w-full overflow-hidden bg-muted shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.cover_image_url}
              alt={course.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-24 w-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-8 h-8 text-primary/40" />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Title + badge */}
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground leading-snug">{course.name}</h2>
            <Badge
              variant={pct === 100 ? 'default' : 'outline'}
              className="shrink-0 text-xs tabular-nums"
            >
              {pct === 100 ? 'Concluído' : `${pct}%`}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{done} de {total} aulas</span>
              <span>{modCount} {modCount === 1 ? 'módulo' : 'módulos'}</span>
            </div>
            <ProgressBar pct={pct} />
          </div>

          {/* Description — scrollable se longa */}
          {course.description && (
            <p className="text-xs text-muted-foreground leading-relaxed max-h-24 overflow-y-auto pr-0.5">
              {course.description}
            </p>
          )}

          {/* Modules — compact chips */}
          {course.modules.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.modules.map((mod) => {
                const pub = mod.lessons.filter((l) => l.is_published)
                const modDone = pub.filter((l) => completedSet.has(l.id)).length
                const complete = pub.length > 0 && modDone === pub.length
                return (
                  <span
                    key={mod.id}
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border',
                      complete
                        ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                        : 'bg-muted border-border text-muted-foreground',
                    )}
                  >
                    {complete
                      ? <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      : <Circle className="w-2.5 h-2.5 shrink-0" />
                    }
                    <span className="truncate max-w-[100px]">{mod.title}</span>
                  </span>
                )
              })}
            </div>
          )}

          {/* Instructor — one liner */}
          {course.instructor_name && (
            <div className="flex items-center gap-2 pt-0.5">
              {course.instructor_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.instructor_photo_url}
                  alt={course.instructor_name}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {course.instructor_name}
                {course.instructor_role && (
                  <span className="text-muted-foreground/60"> · {course.instructor_role}</span>
                )}
              </span>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/dashboard/cursos/${course.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold text-sm py-2.5 rounded-xl mt-1"
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function computeProgress(course: CourseCard, completedSet: Set<string>): CourseProgress {
  const all = course.modules.flatMap((m) => m.lessons.filter((l) => l.is_published))
  const done = all.filter((l) => completedSet.has(l.id)).length
  return { total: all.length, done, pct: all.length > 0 ? Math.round((done / all.length) * 100) : 0 }
}

export function CourseGrid({
  courses,
  completedIds,
}: {
  courses: CourseCard[]
  completedIds: string[]
}) {
  const [selected, setSelected] = useState<CourseCard | null>(null)
  const completedSet = new Set(completedIds)
  const getProgress = (course: CourseCard) => computeProgress(course, completedSet)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const { total, done, pct } = getProgress(course)
          const modCount = course.modules.length
          return (
            <div key={course.id} className="relative group">
              <Link href={`/dashboard/cursos/${course.id}`} className="block">
                <div className="h-full rounded-xl border border-border bg-card hover:border-primary/50 transition-colors overflow-hidden">
                  {course.cover_image_url ? (
                    <div className="aspect-video overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={course.cover_image_url}
                        alt={course.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-muted-foreground/20" />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {course.name}
                      </h3>
                      <Badge variant="outline" className="text-xs shrink-0 tabular-nums">
                        {done}/{total}
                      </Badge>
                    </div>

                    {course.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      {modCount} {modCount === 1 ? 'módulo' : 'módulos'}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progresso</span>
                        <span>{pct}%</span>
                      </div>
                      <ProgressBar pct={pct} />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Info button */}
              <button
                type="button"
                aria-label="Ver detalhes do curso"
                onClick={(e) => { e.stopPropagation(); setSelected(course) }}
                className={cn(
                  'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center',
                  'bg-black/40 text-white backdrop-blur-sm',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity',
                  'hover:bg-black/60',
                )}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {selected && (
        <CourseDetailDialog
          course={selected}
          progress={getProgress(selected)}
          completedSet={completedSet}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
