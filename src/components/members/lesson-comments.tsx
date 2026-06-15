'use client'

import { useTransition, useRef } from 'react'
import { createComment, deleteComment } from '@/app/actions/comments'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Trash2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  profiles: { full_name: string } | null
}

interface LessonCommentsProps {
  lessonId: string
  comments: Comment[]
  currentUserId: string
  isAdmin: boolean
}

export function LessonComments({ lessonId, comments, currentUserId, isAdmin }: LessonCommentsProps) {
  const [isSubmitting, startSubmit] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startSubmit(async () => {
      const result = await createComment(lessonId, formData)
      if (result?.error) toast.error(result.error)
      else formRef.current?.reset()
    })
  }

  function handleDelete(commentId: string) {
    startDelete(async () => {
      const result = await deleteComment(commentId, lessonId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div>
      <Separator className="mb-6" />
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Comentários ({comments.length})</h3>
      </div>

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <Textarea
          name="body"
          placeholder="Deixe um comentário ou dúvida..."
          rows={2}
          required
          className="flex-1 resize-none"
        />
        <Button type="submit" size="sm" disabled={isSubmitting} className="self-end">
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </form>

      {/* Lista */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const name = c.profiles?.full_name || 'Membro'
            const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
            const canDelete = isAdmin || c.user_id === currentUserId
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          disabled={isDeleting}
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
