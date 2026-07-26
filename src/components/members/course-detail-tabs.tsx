'use client'

import { useState, type ComponentProps } from 'react'
import { UserCircle2 } from 'lucide-react'
import { CourseModulesAccordion } from '@/components/members/course-modules-accordion'
import { cn } from '@/lib/utils'

type Instructor = {
  name: string
  role: string | null
  photo: string | null
  bio: string
}

type Props = ComponentProps<typeof CourseModulesAccordion> & {
  instructor: Instructor | null
}

type Tab = 'conteudo' | 'instrutor'

export function CourseDetailTabs({ instructor, ...accordionProps }: Props) {
  const [tab, setTab] = useState<Tab>('conteudo')

  if (!instructor) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Módulos do curso</h2>
        <CourseModulesAccordion {...accordionProps} />
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border flex gap-1 mb-4">
        {([
          { id: 'conteudo', label: 'Conteúdo do curso' },
          { id: 'instrutor', label: 'Instrutor(a)' },
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

      {tab === 'conteudo' && <CourseModulesAccordion {...accordionProps} />}

      {tab === 'instrutor' && (
        <div className="px-5 py-6 bg-card border rounded-xl space-y-4">
          <div className="flex items-center gap-5">
            {instructor.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instructor.photo}
                alt={instructor.name}
                className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-border"
              />
            ) : (
              <UserCircle2 className="w-20 h-20 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground leading-tight">{instructor.name}</p>
              {instructor.role && <p className="text-sm text-muted-foreground mt-0.5">{instructor.role}</p>}
            </div>
          </div>
          {instructor.bio ? (
            <div
              className="rich-text text-sm text-muted-foreground pt-3 border-t border-border"
              dangerouslySetInnerHTML={{ __html: instructor.bio }}
            />
          ) : (
            <p className="text-sm text-muted-foreground pt-3 border-t border-border italic">
              Nenhuma biografia cadastrada ainda.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
