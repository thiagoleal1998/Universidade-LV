'use client'

import { useState } from 'react'
import { UserCircle2, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type Instructor = {
  name: string
  role: string | null
  photo: string | null
  bio: string
}

export function CourseInstructorCard({ instructor }: { instructor: Instructor }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-card border rounded-xl hover:border-primary/40 transition-colors text-left"
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
          <p className="text-xs text-muted-foreground mb-0.5">Instrutor(a)</p>
          <p className="font-semibold text-foreground leading-tight">{instructor.name}</p>
          {instructor.role && <p className="text-sm text-muted-foreground">{instructor.role}</p>}
        </div>
        <span className="text-xs text-primary shrink-0 flex items-center gap-0.5">
          Saber mais
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
        </DialogContent>
      </Dialog>
    </>
  )
}
