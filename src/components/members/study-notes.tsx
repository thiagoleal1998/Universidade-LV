'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { saveNote } from '@/app/actions/notes'
import { Textarea } from '@/components/ui/textarea'
import { Check, Loader2 } from 'lucide-react'

type Props = {
  lessonId: string
  initialContent: string
}

export function StudyNotes({ lessonId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isPending, startTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setContent(initialContent)
  }, [lessonId, initialContent])

  function handleChange(val: string) {
    setContent(val)
    setStatus('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        await saveNote(lessonId, val)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2000)
      })
    }, 1500)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Suas anotações pessoais — visíveis apenas para você.{' '}
          <span className="text-xs">
            Salvas automaticamente.{' '}
            <a href="/dashboard/documentos/anotacoes" className="underline hover:text-foreground transition-colors">
              Veja todas em Documentos →
            </a>
          </span>
        </p>
        {status === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Salvando...
          </span>
        )}
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            Salvo
          </span>
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escreva suas anotações aqui..."
        className="min-h-48 resize-none font-mono text-sm"
        disabled={isPending}
      />
    </div>
  )
}
