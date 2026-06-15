'use client'

import { useState, useTransition } from 'react'
import { updateMemberNotes } from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { NotebookPen } from 'lucide-react'

export function MemberNotesForm({ memberId, initialNotes }: { memberId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateMemberNotes(memberId, notes)
      if (result?.error) toast.error(result.error)
      else toast.success('Notas salvas.')
    })
  }

  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Notas Internas</h3>
        <span className="text-xs text-muted-foreground ml-1">(visível apenas para admins)</span>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observações privadas sobre este membro: histórico de contato, particularidades, etc."
        rows={4}
        className="mb-3 resize-none"
      />
      <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-2">
        {isPending ? <><Spinner className="w-3.5 h-3.5" /> Salvando...</> : 'Salvar notas'}
      </Button>
    </div>
  )
}
