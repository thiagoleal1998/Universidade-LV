'use client'

import { useState, useTransition } from 'react'
import { createCourse } from '@/app/actions/courses'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCourse(formData)
      if (result?.error) toast.error(result.error)
      else { toast.success('Curso criado!'); setOpen(false) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="w-4 h-4 mr-2" />
        Novo Curso
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Curso</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do curso</Label>
            <Input id="name" name="name" placeholder="Ex: Portal do Agente" required autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Spinner className="w-4 h-4" /> Criando...</> : 'Criar Curso'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
