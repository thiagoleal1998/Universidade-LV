'use client'

import { useState, useTransition } from 'react'
import { createReply, deleteReply, togglePinPost, toggleLockPost, deletePost, hidePost, hideReply } from '@/app/actions/community'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pin, Lock, Trash2, MessageSquare, Send, EyeOff, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/time'
import { CommunityPoll } from '@/components/members/community-poll'

type Post = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  is_locked: boolean
  is_hidden: boolean
  created_at: string
  user_id: string
  course_id: string
  profiles: { full_name: string; role: string } | null
}

type Reply = {
  id: string
  body: string
  is_hidden: boolean
  created_at: string
  user_id: string
  profiles: { full_name: string; role: string } | null
}

type Poll = {
  id: string
  question: string
  options: string[]
  ends_at: string | null
}

type PollVote = {
  option_index: number
  user_id: string
}

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function CommunityPostView({
  post: initialPost,
  replies,
  courseId,
  currentUserId,
  isAdmin,
  poll,
  pollVotes,
  basePath = '/dashboard/comunidade',
}: {
  post: Post
  replies: Reply[]
  courseId: string
  currentUserId: string
  isAdmin: boolean
  poll?: Poll | null
  pollVotes?: PollVote[]
  basePath?: string
}) {
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [isSubmitting, startSubmit] = useTransition()
  const [isPinning, startPin] = useTransition()
  const [isLocking, startLock] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isHiding, startHide] = useTransition()

  const isAuthor = post.user_id === currentUserId
  // Autor ainda vê o próprio conteúdo (com aviso); outros membros veem só um aviso genérico.
  const isMaskedForViewer = post.is_hidden && !isAdmin && !isAuthor

  function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const form = e.currentTarget
    startSubmit(async () => {
      const r = await createReply(post.id, courseId, fd)
      if (r?.error) toast.error(r.error)
      else { toast.success('Resposta enviada!'); form.reset() }
    })
  }

  function handlePin() {
    startPin(async () => {
      const r = await togglePinPost(post.id, !post.is_pinned, courseId)
      if (r?.error) toast.error(r.error)
      else setPost((p) => ({ ...p, is_pinned: !p.is_pinned }))
    })
  }

  function handleLock() {
    startLock(async () => {
      const r = await toggleLockPost(post.id, !post.is_locked, courseId)
      if (r?.error) toast.error(r.error)
      else setPost((p) => ({ ...p, is_locked: !p.is_locked }))
    })
  }

  function handleHidePost() {
    startHide(async () => {
      const r = await hidePost(post.id, !post.is_hidden, courseId)
      if (r?.error) toast.error(r.error)
      else { toast.success(post.is_hidden ? 'Post reexibido.' : 'Post ocultado.'); setPost((p) => ({ ...p, is_hidden: !p.is_hidden })) }
    })
  }

  function handleDeletePost() {
    startDelete(async () => {
      const r = await deletePost(post.id, courseId)
      if (r?.error) toast.error(r.error)
      else { toast.success('Post excluído.'); router.push(`${basePath}/${courseId}`) }
    })
  }

  return (
    <div className="space-y-4">
      {/* Post card */}
      <div className={cn('bg-card border rounded-xl p-5', post.is_pinned && 'border-primary/30 bg-primary/5')}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isMaskedForViewer ? (
                <h1 className="text-xl font-bold text-muted-foreground italic">Este post foi removido pela moderação</h1>
              ) : (
                <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
              )}
              {post.is_pinned && (
                <Badge variant="outline" className="text-xs text-primary border-primary/40">
                  <Pin className="w-3 h-3 mr-1" />Fixado
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />Encerrado
                </Badge>
              )}
              {post.is_hidden && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/40">
                  Oculto
                </Badge>
              )}
            </div>
            {post.is_hidden && isAuthor && !isAdmin && (
              <p className="text-xs text-amber-500 mb-1.5">Ocultado pela moderação — só você e admins veem.</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {post.profiles?.role === 'admin' ? (
                <span className="font-medium flex items-center gap-1">
                  <span className="text-primary font-semibold">Moderador</span>
                  <span>{post.profiles.full_name}</span>
                </span>
              ) : (
                <span className="font-medium">{post.profiles?.full_name || 'Membro'}</span>
              )}
              <span>·</span>
              <span>{formatDistanceToNow(post.created_at)}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePin}
                disabled={isPinning}
                title={post.is_pinned ? 'Desafixar' : 'Fixar post'}
                className={cn(
                  'p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors',
                  post.is_pinned ? 'text-primary' : 'hover:text-primary'
                )}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={handleLock}
                disabled={isLocking}
                title={post.is_locked ? 'Reabrir discussão' : 'Encerrar discussão'}
                className={cn(
                  'p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors',
                  post.is_locked ? 'text-amber-500' : 'hover:text-amber-500'
                )}
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={handleHidePost}
                disabled={isHiding}
                title={post.is_hidden ? 'Reexibir post' : 'Ocultar post'}
                className={cn(
                  'p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors',
                  post.is_hidden ? 'text-red-500' : 'hover:text-red-500'
                )}
              >
                {post.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <AlertDialog>
                <AlertDialogTrigger render={
                  <button
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                    disabled={isDeleting}
                    title="Excluir post"
                  />
                }>
                  <Trash2 className="w-4 h-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir este post?</AlertDialogTitle>
                    <AlertDialogDescription>Todas as respostas serão excluídas. Ação irreversível.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {!isMaskedForViewer && post.body && (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.body}</p>
        )}

        {/* Poll */}
        {!isMaskedForViewer && poll && (
          <div className="mt-4">
            <CommunityPoll
              poll={poll}
              votes={pollVotes ?? []}
              currentUserId={currentUserId}
              postId={post.id}
              courseId={courseId}
            />
          </div>
        )}
      </div>

      {/* Replies header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
        </span>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              courseId={courseId}
              postId={post.id}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {post.is_locked ? (
        <div className="flex items-center gap-2 bg-muted/50 border border-dashed rounded-xl px-4 py-3 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0" />
          Esta discussão foi encerrada e não aceita novas respostas.
        </div>
      ) : (
        <form onSubmit={handleReply} className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Sua resposta</p>
          <Textarea
            name="body"
            placeholder="Escreva sua resposta..."
            rows={4}
            required
          />
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {isSubmitting ? 'Enviando...' : 'Enviar resposta'}
          </Button>
        </form>
      )}
    </div>
  )
}

function ReplyItem({
  reply,
  courseId,
  postId,
  currentUserId,
  isAdmin,
}: {
  reply: Reply
  courseId: string
  postId: string
  currentUserId: string
  isAdmin: boolean
}) {
  const [isDeleting, startDelete] = useTransition()
  const [isHiding, startHide] = useTransition()
  const [isHidden, setIsHidden] = useState(reply.is_hidden)
  const isAuthor = reply.user_id === currentUserId
  const canDelete = isAdmin || isAuthor
  const isMaskedForViewer = isHidden && !isAdmin && !isAuthor

  function handleDelete() {
    startDelete(async () => {
      const r = await deleteReply(reply.id, postId, courseId)
      if (r?.error) toast.error(r.error)
    })
  }

  function handleHide() {
    startHide(async () => {
      const r = await hideReply(reply.id, !isHidden, postId, courseId)
      if (r?.error) toast.error(r.error)
      else { toast.success(isHidden ? 'Resposta reexibida.' : 'Resposta ocultada.'); setIsHidden((h) => !h) }
    })
  }

  const isModeratorReply = reply.profiles?.role === 'admin'
  const name = reply.profiles?.full_name || 'Membro'

  return (
    <div className={cn('flex gap-3 bg-card border rounded-xl p-4 group', isModeratorReply && 'border-primary/20 bg-primary/5')}>
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn('text-xs', isModeratorReply ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground')}>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {isModeratorReply ? (
              <span className="font-medium text-foreground flex items-center gap-1">
                <span className="text-primary font-semibold">Moderador</span>
                <span>{name}</span>
              </span>
            ) : (
              <span className="font-medium text-foreground">{name}</span>
            )}
            <span className="text-muted-foreground">{formatDistanceToNow(reply.created_at)}</span>
            {isHidden && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/40 py-0">Oculto</Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            {isAdmin && (
              <button
                onClick={handleHide}
                disabled={isHiding}
                title={isHidden ? 'Reexibir resposta' : 'Ocultar resposta'}
                className={cn('p-1 rounded text-muted-foreground hover:bg-muted', isHidden ? 'text-red-500' : 'hover:text-red-500')}
              >
                {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <button
                    className="p-1 rounded text-muted-foreground hover:text-red-500"
                    disabled={isDeleting}
                  />
                }>
                  <Trash2 className="w-3.5 h-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
                    <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {isMaskedForViewer ? (
          <p className="text-sm text-muted-foreground italic mt-1.5">Esta resposta foi removida pela moderação.</p>
        ) : (
          <>
            <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
            {isHidden && isAuthor && !isAdmin && (
              <p className="text-xs text-amber-500 mt-1">Ocultado pela moderação — só você e admins veem.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
