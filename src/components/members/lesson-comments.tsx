'use client'

import { useTransition, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createComment, deleteComment, toggleCommentPinned, toggleCommentHidden,
} from '@/app/actions/comments'
import { COMMENT_MAX_LENGTH } from '@/lib/comments'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Trash2, MessageCircle, CornerDownRight, Pin, PinOff, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  parent_id: string | null
  is_pinned: boolean
  is_hidden: boolean
  profiles: { full_name: string } | null
}

interface LessonCommentsProps {
  lessonId: string
  comments: Comment[]
  currentUserId: string
  isAdmin: boolean
  canModerate?: boolean
}

function initialsOf(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

// Aviso só quando o limite começa a apertar — contador sempre visível vira ruído.
const COUNTER_VISIBLE_FROM = COMMENT_MAX_LENGTH - 200

function CharCounter({ value }: { value: string }) {
  if (value.length < COUNTER_VISIBLE_FROM) return null
  const left = COMMENT_MAX_LENGTH - value.length
  return (
    <span className={cn('text-xs tabular-nums', left <= 0 ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
      {left} {Math.abs(left) === 1 ? 'caractere restante' : 'caracteres restantes'}
    </span>
  )
}

export function LessonComments({
  lessonId, comments, currentUserId, isAdmin, canModerate = false,
}: LessonCommentsProps) {
  const router = useRouter()
  const [isSubmitting, startSubmit] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isModerating, startModerate] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  // Quem não modera nem escreveu não vê comentário oculto — nem o espaço dele.
  const visible = comments.filter((c) => !c.is_hidden || canModerate || c.user_id === currentUserId)
  // Fixados sobem; o resto mantém a ordem cronológica que veio do servidor.
  const roots = visible
    .filter((c) => !c.parent_id)
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
  const repliesOf = (id: string) => visible.filter((c) => c.parent_id === id)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startSubmit(async () => {
      const result = await createComment(lessonId, formData)
      if (result?.error) toast.error(result.error)
      else {
        formRef.current?.reset()
        setBody('')
        router.refresh()
      }
    })
  }

  function handleReply(parentId: string) {
    const text = replyBody.trim()
    if (!text) return
    const formData = new FormData()
    formData.set('body', text)
    formData.set('parent_id', parentId)
    startSubmit(async () => {
      const result = await createComment(lessonId, formData)
      if (result?.error) toast.error(result.error)
      else {
        setReplyBody('')
        setReplyTo(null)
        router.refresh()
      }
    })
  }

  function handleDelete(commentId: string) {
    startDelete(async () => {
      const result = await deleteComment(commentId, lessonId)
      if (result?.error) toast.error(result.error)
      else router.refresh()
    })
  }

  function handlePin(c: Comment) {
    startModerate(async () => {
      const r = await toggleCommentPinned(c.id, !c.is_pinned, lessonId)
      if (r?.error) toast.error(r.error)
      else { toast.success(c.is_pinned ? 'Comentário desafixado.' : 'Comentário fixado no topo.'); router.refresh() }
    })
  }

  function handleHide(c: Comment) {
    startModerate(async () => {
      const r = await toggleCommentHidden(c.id, !c.is_hidden, lessonId)
      if (r?.error) toast.error(r.error)
      else { toast.success(c.is_hidden ? 'Comentário reexibido.' : 'Comentário ocultado.'); router.refresh() }
    })
  }

  function CommentBody({ c, isReply }: { c: Comment; isReply?: boolean }) {
    const name = c.profiles?.full_name || 'Membro'
    const isAuthor = c.user_id === currentUserId
    const canDelete = isAdmin || canModerate || isAuthor

    return (
      <div className="flex gap-3">
        <Avatar className={cn('shrink-0 mt-0.5', isReply ? 'w-7 h-7' : 'w-8 h-8')}>
          <AvatarFallback className="text-xs bg-muted">{initialsOf(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
              {name}
              {c.is_pinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                  <Pin className="w-2.5 h-2.5" /> Fixado
                </span>
              )}
              {c.is_hidden && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 rounded-full px-1.5 py-0.5">
                  <EyeOff className="w-2.5 h-2.5" /> Oculto
                </span>
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>

              {canModerate && !isReply && (
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-6 w-6', c.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
                  disabled={isModerating}
                  onClick={() => handlePin(c)}
                  title={c.is_pinned ? 'Desafixar' : 'Fixar no topo'}
                >
                  {c.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                </Button>
              )}
              {canModerate && (
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-6 w-6', c.is_hidden ? 'text-amber-600' : 'text-muted-foreground hover:text-amber-600')}
                  disabled={isModerating}
                  onClick={() => handleHide(c)}
                  title={c.is_hidden ? 'Reexibir' : 'Ocultar'}
                >
                  {c.is_hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                  disabled={isDeleting}
                  onClick={() => handleDelete(c.id)}
                  title="Excluir"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>

          {/* O autor continua vendo o próprio texto, mas precisa saber que
              ninguém mais está vendo. */}
          {c.is_hidden && !canModerate && isAuthor && (
            <p className="text-xs text-amber-600 mt-1 italic">
              Ocultado pela moderação — só você e a equipe do curso veem este comentário.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              const root = c.parent_id ?? c.id
              setReplyTo(replyTo === root ? null : root)
              setReplyBody('')
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            <CornerDownRight className="w-3 h-3" />
            Responder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Separator className="mb-6" />
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Comentários ({visible.length})</h3>
      </div>

      {/* Form principal */}
      <form ref={formRef} onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <Textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Deixe um comentário ou dúvida..."
            rows={2}
            required
            maxLength={COMMENT_MAX_LENGTH}
            className="flex-1 resize-none"
          />
          <Button type="submit" size="sm" disabled={isSubmitting || !body.trim()} className="self-end">
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
        <div className="flex justify-end mt-1 min-h-[16px]">
          <CharCounter value={body} />
        </div>
      </form>

      {/* Lista */}
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <div className="space-y-5">
          {roots.map((c) => {
            const replies = repliesOf(c.id)
            return (
              <div
                key={c.id}
                className={cn(c.is_pinned && 'rounded-lg border border-primary/20 bg-primary/[0.03] p-3 -m-0.5')}
              >
                <CommentBody c={c} />

                {replies.length > 0 && (
                  <div className="mt-3 ml-6 md:ml-11 space-y-3 border-l border-border pl-4">
                    {replies.map((r) => <CommentBody key={r.id} c={r} isReply />)}
                  </div>
                )}

                {replyTo === c.id && (
                  <div className="mt-3 ml-6 md:ml-11 pl-4 border-l border-border">
                    <Textarea
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={`Respondendo ${c.profiles?.full_name || 'Membro'}...`}
                      rows={2}
                      maxLength={COMMENT_MAX_LENGTH}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <CharCounter value={replyBody} />
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => { setReplyTo(null); setReplyBody('') }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button" size="sm"
                          disabled={isSubmitting || !replyBody.trim()}
                          onClick={() => handleReply(c.id)}
                        >
                          {isSubmitting ? 'Enviando...' : 'Responder'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
