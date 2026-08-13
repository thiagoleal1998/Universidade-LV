'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Clock, XCircle, Lock } from 'lucide-react'
import { UF_NAMES } from '@/lib/estado-flag'
import type { AccessRequestStatus } from '@/lib/access-lock'
import { cn } from '@/lib/utils'

// Selo "Exclusivo para..." + botão de solicitar/estado da solicitação —
// genérico por conteúdo (treinamento, famtour, etc.): quem chama passa
// `onRequest`, a própria server action de cada entidade (requestTrainingAccess/
// requestFamtourAccess). Usado nos lugares onde um item bloqueado aparece
// pro membro; `compact` mostra só o selo (sem botão), pra cards de grade e o
// widget da home, onde o botão completo mora em outro lugar (detalhe/página).
export function RequestAccessButton({
  onRequest,
  exclusiveUfs,
  status,
  compact = false,
}: {
  onRequest: () => Promise<{ error?: string } | { success: true }>
  exclusiveUfs: string[]
  status: AccessRequestStatus
  compact?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const ufLabel = exclusiveUfs.map((u) => UF_NAMES[u] ?? u).join(', ')

  function handleRequest() {
    startTransition(async () => {
      const result = await onRequest()
      if ('error' in result && result.error) toast.error(result.error)
      else { toast.success('Solicitação enviada! Você será avisado quando for respondida.'); router.refresh() }
    })
  }

  const badge = (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 w-fit',
      compact && 'text-[11px] px-2 py-0.5'
    )}>
      <MapPin className="w-3 h-3 shrink-0" />
      Exclusivo para {ufLabel}
    </span>
  )

  if (compact) return badge

  return (
    <div className="flex flex-col gap-2">
      {badge}
      {status === 'pending' && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground w-fit">
          <Clock className="w-4 h-4 shrink-0" />
          Solicitação enviada — aguardando resposta.
        </span>
      )}
      {status === 'denied' && (
        <>
          <span className="inline-flex items-center gap-1.5 text-sm text-red-500 w-fit">
            <XCircle className="w-4 h-4 shrink-0" />
            Acesso negado.
          </span>
          <button
            type="button"
            onClick={handleRequest}
            disabled={isPending}
            className="inline-flex items-center gap-2 self-start bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            {isPending ? 'Enviando...' : 'Solicitar novamente'}
          </button>
        </>
      )}
      {status === 'none' && (
        <button
          type="button"
          onClick={handleRequest}
          disabled={isPending}
          className="inline-flex items-center gap-2 self-start bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
        >
          <Lock className="w-4 h-4" />
          {isPending ? 'Enviando...' : 'Solicitar acesso'}
        </button>
      )}
    </div>
  )
}
