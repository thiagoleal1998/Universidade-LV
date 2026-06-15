'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'
import { updateModule, deleteModule, toggleModulePublished } from '@/app/actions/modules'
import { createLesson, deleteLesson, reorderLesson, publishAllLessons } from '@/app/actions/lessons'
import type { Module, Lesson } from '@/lib/supabase/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Eye, ChevronUp, ChevronDown, BookCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ModuleWithLessons = Module & { lessons: Lesson[] }
type ModuleSummary = Pick<Module, 'id' | 'title'>

export function ModuleEditor({ mod, allModules = [] }: { mod: ModuleWithLessons; allModules?: ModuleSummary[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCreatingLesson, setCreatingLesson] = useTransition()
  const [isReordering, startReorder] = useTransition()
  const [isPublishingAll, startPublishAll] = useTransition()
  const [title, setTitle] = useState(mod.title)
  const [description, setDescription] = useState(mod.description)
  const [prerequisiteId, setPrerequisiteId] = useState(mod.prerequisite_module_id ?? 'none')

  function handleReorderLesson(lessonId: string, direction: 'up' | 'down') {
    startReorder(async () => {
      const result = await reorderLesson(lessonId, mod.id, direction)
      if (result?.error) toast.error(result.error)
    })
  }

  async function handleUpdateModule(formData: FormData) {
    startTransition(async () => {
      const result = await updateModule(mod.id, formData)
      if (result?.error) toast.error(result.error)
      else toast.success('Módulo atualizado!')
    })
  }

  async function handleTogglePublish() {
    startTransition(async () => {
      const result = await toggleModulePublished(mod.id, !mod.is_published)
      if (result?.error) toast.error(result.error)
      else toast.success(mod.is_published ? 'Módulo despublicado.' : 'Módulo publicado!')
    })
  }

  async function handleDeleteModule() {
    startTransition(async () => {
      const result = await deleteModule(mod.id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Módulo excluído.')
        router.push('/admin/modulos')
      }
    })
  }

  async function handleCreateLesson(formData: FormData) {
    setCreatingLesson(async () => {
      const result = await createLesson(mod.id, formData)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Aula criada!')
        if (result.data) router.push(`/admin/aulas/${result.data.id}`)
      }
    })
  }

  async function handleDeleteLesson(lessonId: string) {
    const result = await deleteLesson(lessonId, mod.id)
    if (result?.error) toast.error(result.error)
    else toast.success('Aula excluída.')
  }

  return (
    <div className="space-y-8">
      {/* Formulário do módulo */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Informações do Módulo</h3>
        <form action={handleUpdateModule} className="space-y-4">
          <input type="hidden" name="is_published" value={String(mod.is_published)} />
          <div className="space-y-2">
            <Label>Título</Label>
            <Input name="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea name="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          {allModules.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="prerequisite_module_id">Pré-requisito</Label>
              <select
                id="prerequisite_module_id"
                name="prerequisite_module_id"
                value={prerequisiteId}
                onChange={e => setPrerequisiteId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="none">Nenhum (módulo livre)</option>
                {allModules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                O membro só poderá acessar este módulo após concluir 100% do módulo selecionado.
              </p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={handleTogglePublish} disabled={isPending}>
              {mod.is_published ? 'Despublicar' : 'Publicar'}
            </Button>
            <Link
              href={`/dashboard/modulos/${mod.id}`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: mod.is_published ? 'outline' : 'ghost' }),
                'gap-1.5',
                !mod.is_published && 'text-muted-foreground border border-dashed'
              )}
            >
              <Eye className="w-4 h-4" />
              {mod.is_published ? 'Ver página' : 'Ver prévia'}
            </Link>
            <AlertDialog>
              <AlertDialogTrigger render={<Button type="button" variant="destructive" size="icon" />}>
                <Trash2 className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir módulo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todas as aulas deste módulo também serão excluídas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteModule}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </div>

      <Separator />

      {/* Aulas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Aulas ({mod.lessons.length})</h3>
          {mod.lessons.some((l) => !l.is_published) && (
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={isPublishingAll} />
              }>
                <BookCheck className="w-4 h-4" />
                {isPublishingAll ? 'Publicando...' : 'Publicar todas as aulas'}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publicar todas as aulas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta é uma ação de publicação em massa. Todas as aulas não publicadas deste módulo ficarão
                    visíveis imediatamente para os membros e eles receberão notificações. Esta ação não pode
                    ser desfeita automaticamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      startPublishAll(async () => {
                        const r = await publishAllLessons(mod.id)
                        if (r?.error) toast.error(r.error)
                        else toast.success(`${r.count} ${r.count === 1 ? 'aula publicada' : 'aulas publicadas'}!`)
                      })
                    }}
                  >
                    Sim, publicar todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {mod.lessons.map((lesson, i) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between bg-card border rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-6 rounded-sm"
                    disabled={i === 0 || isReordering}
                    onClick={() => handleReorderLesson(lesson.id, 'up')}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-6 rounded-sm"
                    disabled={i === mod.lessons.length - 1 || isReordering}
                    onClick={() => handleReorderLesson(lesson.id, 'down')}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <span className="text-sm font-medium text-foreground">{lesson.title}</span>
                <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-xs">
                  {lesson.is_published ? 'Publicada' : 'Rascunho'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/admin/aulas/${lesson.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
                  <Pencil className="w-4 h-4" />
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" />}>
                    <Trash2 className="w-4 h-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir aula "{lesson.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteLesson(lesson.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {/* Formulário nova aula */}
        <div className="bg-muted/40 border border-dashed rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">Nova Aula</p>
          <form action={handleCreateLesson} className="flex gap-2">
            <Input name="title" placeholder="Título da aula" required className="flex-1" />
            <Input name="description" placeholder="Descrição (opcional)" className="flex-1" />
            <Button type="submit" size="sm" disabled={isCreatingLesson}>
              <Plus className="w-4 h-4 mr-1" />
              {isCreatingLesson ? 'Criando...' : 'Criar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
