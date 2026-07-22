'use client'

import { useState, useTransition } from 'react'
import { updateMember, deleteMember, assignMemberCourses } from '@/app/actions/members'
import { assignMemberTags } from '@/app/actions/tags'
import { getTagColor, formatMemberCode } from '@/lib/tag-colors'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pencil, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Tag = { id: string; name: string; color: string }
type Course = { id: string; name: string }
type Area = { id: string; name: string }

type Member = {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'member' | 'collaborator'
  active: boolean
  collaborator_area_id?: string | null
  avatar_url?: string
  member_number?: number | null
  bio?: string
  tagIds?: string[]
  courseIds?: string[]
}

export function EditMemberDialog({
  member,
  allTags = [],
  allCourses = [],
  allAreas = [],
}: {
  member: Member
  allTags?: Tag[]
  allCourses?: Course[]
  allAreas?: Area[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(member.tagIds ?? [])
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(member.courseIds ?? [])
  const [selectedRole, setSelectedRole] = useState<Member['role']>(member.role)
  const [selectedAreaId, setSelectedAreaId] = useState<string>(member.collaborator_area_id ?? '')
  const [bioValue, setBioValue] = useState(member.bio ?? '')

  function toggleCourse(id: string) {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const newPassword = data.get('new_password') as string
    const role = data.get('role') as Member['role']

    if (role === 'collaborator' && !selectedAreaId) {
      toast.error('Escolha a área do colaborador.')
      return
    }

    startTransition(async () => {
      const [memberResult] = await Promise.all([
        updateMember(member.id, {
          full_name: data.get('full_name') as string,
          email: data.get('email') as string,
          role,
          active: data.get('active') === 'true',
          new_password: newPassword || undefined,
          collaborator_area_id: role === 'collaborator' ? selectedAreaId : null,
          bio: role !== 'member' ? bioValue : undefined,
        }),
        assignMemberTags(member.id, selectedTagIds),
        assignMemberCourses(member.id, selectedCourseIds),
      ])

      if (memberResult?.error) {
        toast.error(memberResult.error)
      } else {
        toast.success('Membro atualizado!')
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteMember(member.id)
      if (result?.error) toast.error(result.error)
      else { toast.success('Membro excluído.'); setOpen(false) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="w-4 h-4" />
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
          {/* Avatar + member code */}
          <div className="flex items-center gap-3 pb-1">
            <Avatar className="w-12 h-12 shrink-0">
              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
              <AvatarFallback className="text-base">
                {member.full_name ? member.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{member.full_name || 'Sem nome'}</p>
              <p className="text-xs text-muted-foreground font-mono">{formatMemberCode(member.member_number ?? null)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" name="full_name" defaultValue={member.full_name} placeholder="Nome do membro" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={member.email} placeholder="email@exemplo.com" required />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <div className="flex gap-3 flex-wrap">
              {(['member', 'collaborator', 'admin'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={selectedRole === r}
                    onChange={() => setSelectedRole(r)}
                    className="accent-black"
                  />
                  <span className="text-sm">{r === 'member' ? 'Membro' : r === 'collaborator' ? 'Colaborador' : 'Admin'}</span>
                </label>
              ))}
            </div>

            {selectedRole === 'collaborator' && (
              <div className="pt-1">
                <Label htmlFor="collaborator_area" className="text-xs text-muted-foreground">Área do colaborador</Label>
                <select
                  id="collaborator_area"
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione a área...</option>
                  {allAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {allAreas.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nenhuma área criada ainda — crie uma em &quot;Áreas de Colaborador&quot; na tela de Membros.
                  </p>
                )}
              </div>
            )}
          </div>

          {selectedRole !== 'member' && (
            <div className="space-y-2">
              <Label>Bio / Qualificações</Label>
              <p className="text-xs text-muted-foreground">Aparece pros alunos quando esta pessoa é vinculada como instrutor(a) de um curso.</p>
              <RichTextEditor content={bioValue} onChange={setBioValue} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Status da conta</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="active" value="true" defaultChecked={member.active} className="accent-black" />
                <span className="text-sm text-green-700">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="active" value="false" defaultChecked={!member.active} className="accent-black" />
                <span className="text-sm text-red-600">Inativo</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          {allTags.length > 0 && (
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
          )}

          {/* Courses */}
          {allCourses.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label>Acesso a cursos</Label>
                </div>
                <div className="space-y-1">
                  {allCourses.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="accent-black w-4 h-4 shrink-0"
                      />
                      <span className="text-sm text-foreground">{course.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="new_password">
              Nova senha <span className="text-muted-foreground font-normal">(deixe em branco para não alterar)</span>
            </Label>
            <Input id="new_password" name="new_password" type="password" placeholder="Nova senha" minLength={6} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar alterações'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" size="icon" />}>
                <Trash2 className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A conta de <strong>{member.full_name || member.email}</strong> será excluída permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
