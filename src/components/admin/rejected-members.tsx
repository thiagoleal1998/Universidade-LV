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

  if (members.length === 0) return null

  async function handleReconsider(id: string) {
    setReconsideringId(id)
    const result = await reconsiderMember(id)
    setReconsideringId(null)
    if (result?.error) toast.error(result.error)
    else toast.success('Cadastro voltou pra "Aguardando aprovação".')
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        <h3 className="text-sm font-semibold text-foreground">Recusados</h3>
        <span className="text-xs bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded-full">
          {members.length}
        </span>
      </div>

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
