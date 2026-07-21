'use client'

import { useState, useTransition } from 'react'
import { approveMember, rejectMember, updateMemberRole } from '@/app/actions/members'
import { assignMemberTags } from '@/app/actions/tags'
import { getTagColor } from '@/lib/tag-colors'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { UserCheck, UserX, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type PendingMember = {
  id: string
  full_name: string
  email: string
  created_at: string
  avatar_url?: string
}

type Course = { id: string; name: string }
type Tag = { id: string; name: string; color: string }
type Area = { id: string; name: string }

type Role = 'admin' | 'member' | 'collaborator'

function ApproveDialog({
  memberId, memberName, courses, allTags, allAreas,
}: {
  memberId: string; memberName: string; courses: Course[]; allTags: Tag[]; allAreas: Area[]
}) {
  const [open, setOpen] = useState(false)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [role, setRole] = useState<Role>('member')
  const [areaId, setAreaId] = useState('')
  const [isPending, startTransition] = useTransition()

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])
  }
  function toggleTag(id: string) {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  // Admin não precisa de curso matriculado (já vê tudo) — membro/colaborador precisam.
  const needsCourse = role !== 'admin'
  const canSubmit = !needsCourse || selectedCourseIds.length > 0
  const canSubmitArea = role !== 'collaborator' || !!areaId

  function handleApprove() {
    if (!canSubmit || !canSubmitArea) return
    startTransition(async () => {
      const [approveResult, roleResult, tagsResult] = await Promise.all([
        approveMember(memberId, selectedCourseIds),
        updateMemberRole(memberId, role, role === 'collaborator' ? areaId : null),
        assignMemberTags(memberId, selectedTagIds),
      ])
      const error = approveResult?.error || roleResult?.error || tagsResult?.error
      if (error) toast.error(error)
      else { toast.success('Membro aprovado!'); setOpen(false) }
    })
  }

  function handleOpenChange(val: boolean) {
    if (!val) { setSelectedCourseIds([]); setSelectedTagIds([]); setRole('member'); setAreaId('') }
    setOpen(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserCheck className="w-3.5 h-3.5" />
        Aprovar
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aprovar membro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">
            Configure o acesso de <strong className="text-foreground">{memberName || 'este membro'}</strong>:
          </p>

          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <div className="flex gap-3 flex-wrap">
              {(['member', 'collaborator', 'admin'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="accent-black" />
                  <span className="text-sm">{r === 'member' ? 'Membro' : r === 'collaborator' ? 'Colaborador' : 'Admin'}</span>
                </label>
              ))}
            </div>

            {role === 'collaborator' && (
              <div className="pt-1">
                <Label htmlFor="approve_area" className="text-xs text-muted-foreground">Área do colaborador</Label>
                <select
                  id="approve_area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione a área...</option>
                  {allAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {allTags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const c = getTagColor(tag.color)
                    const selected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        style={c.chipStyle}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border-2',
                          selected ? 'border-current opacity-100 shadow-sm' : 'border-transparent opacity-50 hover:opacity-80'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={c.dotStyle} />
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <Label>Acesso a cursos {!needsCourse && <span className="text-muted-foreground font-normal">(opcional pra admin)</span>}</Label>
            </div>
            {courses.length === 0 ? (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <BookOpen className="w-4 h-4 shrink-0" />
                Nenhum curso publicado encontrado.
              </div>
            ) : (
              <div className="space-y-1">
                {courses.map((course) => (
                  <label key={course.id} className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-muted transition-colors">
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
            {needsCourse && selectedCourseIds.length === 0 && courses.length > 0 && (
              <p className="text-xs text-red-500">Selecione pelo menos um curso para continuar.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2 shrink-0">
          <Button onClick={handleApprove} disabled={isPending || !canSubmit || !canSubmitArea} className="flex-1 gap-1.5">
            {isPending ? <Spinner className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {isPending ? 'Aprovando...' : 'Confirmar aprovação'}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RejectButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    startTransition(async () => {
      const result = await rejectMember(memberId)
      if (result?.error) toast.error(result.error)
      else toast.success('Cadastro recusado.')
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" />}>
        <UserX className="w-3.5 h-3.5" />
        Recusar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recusar cadastro?</AlertDialogTitle>
          <AlertDialogDescription>
            O cadastro de <strong>{memberName || 'este membro'}</strong> será marcado como recusado — a pessoa não conseguirá logar, e um e-mail avisando será enviado. Dá pra reconsiderar depois, na lista de recusados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReject} disabled={isPending}>
            {isPending ? 'Recusando...' : 'Recusar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function PendingMembers({
  members, courses, allTags = [], allAreas = [],
}: {
  members: PendingMember[]; courses: Course[]; allTags?: Tag[]; allAreas?: Area[]
}) {
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block mr-1">
                  {new Date(member.created_at).toLocaleDateString('pt-BR')}
                </span>
                <RejectButton memberId={member.id} memberName={member.full_name} />
                <ApproveDialog memberId={member.id} memberName={member.full_name} courses={courses} allTags={allTags} allAreas={allAreas} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
