'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserCircle2, GraduationCap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type InstructorEntry = {
  key: string
  name: string
  role: string | null
  photo: string | null
  bio: string
  courses: { id: string; slug: string | null; name: string }[]
}

function InstructorDialog({ instructor, onClose }: { instructor: InstructorEntry; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Sobre {instructor.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4">
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
            className="rich-text text-sm text-muted-foreground pt-3 mt-1 border-t border-border"
            dangerouslySetInnerHTML={{ __html: instructor.bio }}
          />
        ) : (
          <p className="text-sm text-muted-foreground pt-3 mt-1 border-t border-border italic">
            Nenhuma biografia cadastrada ainda.
          </p>
        )}

        {instructor.courses.length > 0 && (
          <div className="pt-3 mt-1 border-t border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {instructor.courses.length === 1 ? 'Curso ministrado' : 'Cursos ministrados'}
            </p>
            <div className="space-y-1.5">
              {instructor.courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/cursos/${c.slug ?? c.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InstructorsGrid({ instructors }: { instructors: InstructorEntry[] }) {
  const [selected, setSelected] = useState<InstructorEntry | null>(null)

  if (instructors.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <UserCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Nenhum instrutor cadastrado ainda.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {instructors.map((instructor) => (
          <button
            key={instructor.key}
            type="button"
            onClick={() => setSelected(instructor)}
            className="text-left rounded-xl border border-border bg-card hover:border-primary/50 transition-colors p-4 flex items-center gap-4"
          >
            {instructor.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instructor.photo}
                alt={instructor.name}
                className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-border"
              />
            ) : (
              <UserCircle2 className="w-14 h-14 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground leading-tight truncate">{instructor.name}</p>
              {instructor.role && (
                <p className="text-sm text-muted-foreground truncate">{instructor.role}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {instructor.courses.length} {instructor.courses.length === 1 ? 'curso' : 'cursos'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <InstructorDialog instructor={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
