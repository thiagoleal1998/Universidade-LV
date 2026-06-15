'use client'

import { useState, useTransition } from 'react'
import { approveMember } from '@/app/actions/members'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { UserCheck, BookOpen } from 'lucide-react'

type PendingMember = {
  id: string
  full_name: string
  email: string
  created_at: string
  avatar_url?: string
}

type Course = { id: string; name: string }

function ApproveDialog({ memberId, memberName, courses }: { memberId: string; memberName: string; courses: Course[] }) {
  const [open, setOpen] = useState(false)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleApprove() {
    if (selectedCourseIds.length === 0) return
    startTransition(async () => {
      const result = await approveMember(memberId, selectedCourseIds)
      if (result?.error) toast.error(result.error)
      else { toast.success('Membro aprovado!'); setOpen(false) }
    })
  }

  function handleOpenChange(val: boolean) {
    if (!val) setSelectedCourseIds([])
    setOpen(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserCheck className="w-3.5 h-3.5" />
        Aprovar
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar membro</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecione os cursos que <strong className="text-foreground">{memberName || 'este membro'}</strong> poderá acessar:
        </p>

        {courses.length === 0 ? (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <BookOpen className="w-4 h-4 shrink-0" />
            Nenhum curso publicado encontrado. Crie e publique um curso antes de aprovar membros.
          </div>
        ) : (
          <div className="space-y-1.5 mt-1">
            {courses.map((course) => (
              <label
                key={course.id}
                className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCourseIds.includes(course.id)}
                  onChange={() => toggleCourse(course.id)}
                  className="accent-black w-4 h-4 shrink-0"
                />
                <span className="text-sm font-medium text-foreground">{course.name}</span>
              </label>
            ))}
          </div>
        )}

        {selectedCourseIds.length === 0 && courses.length > 0 && (
          <p className="text-xs text-red-500">Selecione pelo menos um curso para continuar.</p>
        )}

        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleApprove}
            disabled={isPending || selectedCourseIds.length === 0 || courses.length === 0}
            className="flex-1 gap-1.5"
          >
            {isPending ? <Spinner className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {isPending ? 'Aprovando...' : 'Confirmar aprovação'}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PendingMembers({ members, courses }: { members: PendingMember[]; courses: Course[] }) {
  if (members.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-foreground">
          Aguardando aprovação
        </h3>
        <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full">
          {members.length}
        </span>
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 divide-y divide-amber-100 dark:divide-amber-500/20 overflow-hidden">
        {members.map((member) => {
          const initials = member.full_name
            ? member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
            : member.email[0]?.toUpperCase() ?? '?'

          return (
            <div key={member.id} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.full_name || <span className="italic text-muted-foreground">Sem nome</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(member.created_at).toLocaleDateString('pt-BR')}
                </span>
                <ApproveDialog memberId={member.id} memberName={member.full_name} courses={courses} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
