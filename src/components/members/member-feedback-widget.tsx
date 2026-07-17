'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { submitFeedback } from '@/app/actions/feedback'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Bug, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Mesmo helper de slide usado em member-sidebar.tsx, para o rótulo recolher junto com o menu
function slideText(collapsed: boolean, maxW = 180): CSSProperties {
  return {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: collapsed ? 0 : maxW,
    opacity: collapsed ? 0 : 1,
    transition: collapsed
      ? 'max-width 240ms cubic-bezier(0.4,0,0.6,1), opacity 160ms ease'
      : 'max-width 280ms cubic-bezier(0.0,0,0.2,1) 60ms, opacity 200ms ease 80ms',
  }
}

type Props = {
  visible: boolean
  collapsed?: boolean
  onNavigate?: () => void
}

export function MemberFeedbackWidget({ visible, collapsed = false, onNavigate }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'bug' | 'suggestion'>('bug')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!visible) return null

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (val) onNavigate?.()
  }

  function handleSubmit() {
    if (!message.trim()) return
    const fd = new FormData()
    fd.set('type', type)
    fd.set('message', message)
    fd.set('page_url', pathname)
    startTransition(async () => {
      const r = await submitFeedback(fd)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Feedback enviado. Obrigado!')
        setMessage('')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="mt-1.5 pt-1.5 border-t border-dashed border-violet-500/30">
        <DialogTrigger render={
          <button
            type="button"
            title={collapsed ? 'Reportar problema' : undefined}
            className={cn(
              'w-full flex items-center rounded-lg font-medium transition-colors',
              'text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 border border-transparent',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
            )}
          />
        }>
          <Bug className="w-4 h-4 shrink-0" />
          <span style={slideText(collapsed, 140)} className="flex items-center gap-1.5 whitespace-nowrap">
            Feedback
            <span className="text-[9px] font-bold uppercase tracking-wide bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full shrink-0">
              Beta
            </span>
          </span>
        </DialogTrigger>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar problema ou sugestão</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('bug')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              type === 'bug' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <Bug className="w-4 h-4" />
            Bug
          </button>
          <button
            type="button"
            onClick={() => setType('suggestion')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              type === 'suggestion' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            Sugestão
          </button>
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={type === 'bug' ? 'Descreva o que aconteceu e onde...' : 'Conte sua ideia...'}
          rows={5}
          className="mt-1"
        />

        <Button onClick={handleSubmit} disabled={isPending || !message.trim()} className="w-full gap-2">
          {isPending && <Spinner className="w-4 h-4" />}
          {isPending ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
