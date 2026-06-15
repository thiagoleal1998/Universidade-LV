'use client'

import { useState, useTransition } from 'react'
import { createMember } from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export function CreateMemberDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMember(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Membro criado com sucesso!')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus className="w-4 h-4 mr-2" />
        Novo Membro
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Membro</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="João Silva"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="joao@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha inicial</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O membro poderá fazer login imediatamente com essas credenciais.
          </p>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Spinner className="w-4 h-4" /> Criando...</> : 'Criar Membro'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
