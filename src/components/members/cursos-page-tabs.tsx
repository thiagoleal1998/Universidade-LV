'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { CourseGrid, type CourseCard } from '@/components/members/course-grid'
import { InstructorsGrid, type InstructorEntry } from '@/components/members/instructors-grid'
import { cn } from '@/lib/utils'

type Tab = 'meus' | 'instrutores'

export function CursosPageTabs({
  courses,
  completedIds,
  instructors,
}: {
  courses: CourseCard[]
  completedIds: string[]
  instructors: InstructorEntry[]
}) {
  const [tab, setTab] = useState<Tab>('meus')

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { id: 'meus', label: 'Meus Cursos' },
          { id: 'instrutores', label: 'Instrutores ULV' },
        ] as { id: Tab; label: string }[]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'meus' ? (
        courses.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum curso disponível ainda.</p>
          </div>
        ) : (
          <CourseGrid courses={courses} completedIds={completedIds} />
        )
      ) : (
        <InstructorsGrid instructors={instructors} />
      )}
    </div>
  )
}
