'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createPost, deletePost, togglePinPost, toggleLockPost } from '@/app/actions/community'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pin, Lock, Trash2, MessageSquare, Plus, X, ChevronRight, BarChart2, Minus } from 'lucide-react'
import { CommunityPoll } from '@/components/members/community-poll'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/time'

type Post = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  user_id: string
  profiles: { full_name: string; role: string } | null
  reply_count: { count: number }[]
  polls: { id: string; question: string; options: string[]; ends_at: string | null; votes: { option_index: number; user_id: string }[] }[]
}

export function CommunityPosts({
  posts,
  courseId,
  currentUserId,
  isAdmin,
  basePath = '/dashboard/comunidade',
}: {
  posts: Post[]
  courseId: string
  currentUserId: string
  isAdmin: boolean
  basePath?: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [showPoll, setShowPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [isCreating, startCreate] = useTransition()

  function addOption() {
    if (pollOptions.length < 4) setPollOptions((p) => [...p, ''])
  }

  function removeOption(i: number) {
    if (pollOptions.length <= 2) return
    setPollOptions((p) => p.filter((_, idx) => idx !== i))
  }

  function updateOption(i: number, value: string) {
    setPollOptions((p) => p.map((o, idx) => (idx === i ? value : o)))
  }

  function resetForm() {
    setShowForm(false)
    setShowPoll(false)
    setPollOptions(['', ''])
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    if (showPoll) {
      pollOptions.forEach((opt, i) => fd.set(`poll_option_${i}`, opt))
    }

    const form = e.currentTarget
    startCreate(async () => {
      const r = await createPost(courseId, fd)
      if (r?.error) toast.error(r.error)
      else { toast.success('Post criado!'); form.reset(); resetForm() }
    })
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova discussão
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-foreground">Nova discussão</p>
            <button type="button" onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Input name="title" placeholder="Título da discussão" required autoFocus />
          <Textarea name="body" placeholder="Escreva sua mensagem... (opcional)" rows={3} />

          {isAdmin && showPoll && (
            <div className="border border-dashed border-primary/40 rounded-lg p-3 space-y-2 bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" /> Enquete
                </p>
                <button
                  type="button"
                  onClick={() => { setShowPoll(false); setPollOptions(['', '']) }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input
                name="poll_question"
                placeholder="Pergunta da enquete"
                className="text-sm"
              />
              <div className="space-y-1.5">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`}
                      className="text-sm"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="text-muted-foreground hover:text-red-500 shrink-0"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar opção
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button type="submit" disabled={isCreating} className="gap-2">
              {isCreating ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isCreating ? 'Publicando...' : 'Publicar'}
            </Button>
            {isAdmin && !showPoll && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPoll(true)}
                className="gap-1.5"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Adicionar enquete
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-xl">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma discussão ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a começar uma conversa!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              courseId={courseId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({
  post,
  courseId,
  currentUserId,
  isAdmin,
  basePath = '/dashboard/comunidade',
}: {
  post: Post
  courseId: string
  currentUserId: string
  isAdmin: boolean
  basePath?: string
}) {
  const [isDeleting, startDelete] = useTransition()
  const [isPinning, startPin] = useTransition()
  const [isLocking, startLock] = useTransition()

  const replyCount = post.reply_count?.[0]?.count ?? 0
  const canDelete = isAdmin || post.user_id === currentUserId

  function handlePin() {
    startPin(async () => {
      const r = await togglePinPost(post.id, !post.is_pinned, courseId)
      if (r?.error) toast.error(r.error)
    })
  }

  function handleLock() {
    startLock(async () => {
      const r = await toggleLockPost(post.id, !post.is_locked, courseId)
      if (r?.error) toast.error(r.error)
    })
  }

  function handleDelete() {
    startDelete(async () => {
      const r = await deletePost(post.id, courseId)
      if (r?.error) toast.error(r.error)
      else toast.success('Post removido.')
    })
  }

  const poll = post.polls?.[0]

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 flex gap-3',
      post.is_pinned && 'border-primary/30 bg-primary/5',
      poll && !post.is_pinned && 'border-primary/20'
    )}>
      {post.is_pinned && (
        <div className="mt-1 shrink-0">
          <Pin className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <Link
            href={`${basePath}/${courseId}/${post.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 flex-1"
          >
            {post.title}
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            {post.is_pinned && <Badge variant="outline" className="text-xs text-primary border-primary/40 py-0">Fixado</Badge>}
            {post.is_locked && <Badge variant="secondary" className="text-xs py-0">Encerrado</Badge>}
          </div>
        </div>

        {post.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.body}</p>
        )}

        {/* Inline poll */}
        {poll && (
          <div className="my-2">
            <CommunityPoll
              poll={poll}
              votes={poll.votes}
              currentUserId={currentUserId}
              postId={post.id}
              courseId={courseId}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
            {!poll && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {replyCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <button
                  onClick={handlePin}
                  disabled={isPinning}
                  title={post.is_pinned ? 'Desafixar' : 'Fixar'}
                  className={cn(
                    'p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors',
                    post.is_pinned && 'text-primary'
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLock}
                  disabled={isLocking}
                  title={post.is_locked ? 'Reabrir' : 'Encerrar discussão'}
                  className={cn(
                    'p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors',
                    post.is_locked && 'text-amber-500'
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <button
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                    disabled={isDeleting}
                    title="Excluir post"
                  />
                }>
                  <Trash2 className="w-3.5 h-3.5" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir discussão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todas as respostas também serão excluídas. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {!poll && (
              <Link
                href={`${basePath}/${courseId}/${post.id}`}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
