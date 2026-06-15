'use client'

import { useState, useTransition } from 'react'
import { createModule } from '@/app/actions/modules'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export function CreateModuleDialog({ courseId }: { courseId?: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    if (courseId) formData.set('course_id', courseId)
    startTransition(async () => {
      const result = await createModule(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Módulo criado com sucesso!')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Módulo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Módulo</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" placeholder="Ex: Módulo 1 - Introdução" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o conteúdo deste módulo..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Spinner className="w-4 h-4" /> Criando...</> : 'Criar Módulo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
