'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveMemberAll, deleteMember } from '@/app/actions/members'
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
import { Pencil, Trash2, BookOpen, KeyRound } from 'lucide-react'
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
  linkedin_url?: string | null
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
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(member.tagIds ?? [])
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(member.courseIds ?? [])
  const [selectedRole, setSelectedRole] = useState<Member['role']>(member.role)
  const [selectedAreaId, setSelectedAreaId] = useState<string>(member.collaborator_area_id ?? '')
  const [bioValue, setBioValue] = useState(member.bio ?? '')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [newPasswordValue, setNewPasswordValue] = useState('')


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
    // Só considera a senha se o campo foi aberto de propósito. Blindagem
    // contra autopreenchimento do navegador (ver comentário no campo abaixo).
    const newPassword = showPasswordField ? newPasswordValue : ''
    const role = data.get('role') as Member['role']

    if (role === 'collaborator' && !selectedAreaId) {
      toast.error('Escolha a área do colaborador.')
      return
    }

    startTransition(async () => {
      // UMA só Server Action (saveMemberAll) em vez das 4 que existiam aqui.
      // Cada requisição passa pelo middleware, que renova o token quando ele
      // está vencendo; com 4 requisições próximas, duas renovavam quase juntas,
      // o refresh_token era rotacionado e a retardatária chegava sem sessão —
      // parte do formulário salvava e o resto falhava com "Apenas admins podem
      // fazer isso". Ver CLAUDE.md (v1.102.7).
      const result = await saveMemberAll(member.id, {
        full_name: data.get('full_name') as string,
        email: data.get('email') as string,
        role,
        active: data.get('active') === 'true',
        new_password: newPassword || undefined,
        collaborator_area_id: role === 'collaborator' ? selectedAreaId : null,
        bio: role !== 'member' ? bioValue : undefined,
        linkedin_url: data.get('linkedin_url') as string,
        tagIds: selectedTagIds,
        courseIds: selectedCourseIds,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Membro atualizado!')
        setOpen(false)
        router.refresh()
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

      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" defaultValue={member.full_name} placeholder="Nome do membro" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={member.email} placeholder="email@exemplo.com" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input id="linkedin_url" name="linkedin_url" type="url" defaultValue={member.linkedin_url ?? ''} placeholder="https://linkedin.com/in/perfil" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {selectedRole !== 'member' && (
            <div className="space-y-2">
              <Label>Bio / Qualificações</Label>
              <p className="text-xs text-muted-foreground">Aparece pros alunos quando esta pessoa é vinculada como instrutor(a) de um curso.</p>
              <RichTextEditor content={bioValue} onChange={setBioValue} />
            </div>
          )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
                      <span className="text-sm text-foreground truncate">{course.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Campo de senha só existe no DOM depois de pedido explicitamente.
              Enquanto ficava sempre renderizado, gerenciador de senha do
              navegador AUTOPREENCHIA ele — e como trocar a senha revoga todas
              as sessões do usuário no Supabase, o admin que editava o próprio
              perfil perdia a sessão no meio do save e via "Apenas admins podem
              fazer isso" (bug real, v1.103.1). Sem o input no DOM, não há o
              que autopreencher. */}
          <div className="space-y-2">
            {!showPasswordField ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordField(true)}
                className="gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Alterar senha
              </Button>
            ) : (
              <>
                <Label htmlFor="new_password">Nova senha</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  autoComplete="new-password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                />
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Trocar a senha desconecta esta pessoa de todos os aparelhos — inclusive você, se for a sua própria conta.

                </p>
                <button
                  type="button"
                  onClick={() => { setShowPasswordField(false); setNewPasswordValue('') }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Cancelar troca de senha
                </button>
              </>
            )}
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
