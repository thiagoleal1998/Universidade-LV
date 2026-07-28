'use client'

import { useState } from 'react'
import { reconsiderMember } from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'

type RejectedMember = {
  id: string
  full_name: string
  email: string
  created_at: string
}

export function RejectedMembers({ members }: { members: RejectedMember[] }) {
  const [reconsideringId, setReconsideringId] = useState<string | null>(null)

  async function handleReconsider(id: string) {
    setReconsideringId(id)
    const result = await reconsiderMember(id)
    setReconsideringId(null)
    if (result?.error) toast.error(result.error)
    else toast.success('Cadastro voltou pra "Aguardando aprovação".')
  }

  if (members.length === 0) {
    return (
      <div className="bg-card border rounded-lg py-10 text-center text-sm text-muted-foreground">
        Nenhum cadastro recusado.
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border overflow-hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.full_name || <span className="italic text-muted-foreground">Sem nome</span>}
              </p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={reconsideringId === member.id}
              onClick={() => handleReconsider(member.id)}
            >
              {reconsideringId === member.id ? <Spinner className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Reconsiderar
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
