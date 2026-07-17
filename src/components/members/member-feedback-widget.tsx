'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { submitFeedback } from '@/app/actions/feedback'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Bug, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function MemberFeedbackWidget({ visible }: { visible: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'bug' | 'suggestion'>('bug')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!visible) return null
  if (pathname.startsWith('/dashboard/aulas/')) return null

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
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-28 right-4 z-40">
        <DialogTrigger render={
          <Button size="icon" variant="outline" className="rounded-full shadow-lg bg-card text-muted-foreground w-10 h-10" />
        } title="Reportar problema">
          <Bug className="w-4 h-4" />
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
