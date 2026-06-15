'use client'

import { useState, useTransition } from 'react'
import { votePoll, changeVote } from '@/app/actions/polls'
import { Spinner } from '@/components/ui/spinner'
import { BarChart2, CheckCircle2, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type PollProps = {
  poll: {
    id: string
    question: string
    options: string[]
    ends_at: string | null
  }
  votes: { option_index: number; user_id: string }[]
  currentUserId: string
  postId: string
  courseId: string
}

export function CommunityPoll({ poll, votes, currentUserId, postId, courseId }: PollProps) {
  const myVote = votes.find((v) => v.user_id === currentUserId)
  const [selected, setSelected] = useState<number | null>(myVote?.option_index ?? null)
  const [localVotes, setLocalVotes] = useState(votes)
  const [isPending, startTransition] = useTransition()

  const totalVotes = localVotes.length
  const hasVoted = selected !== null
  const isEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false

  const counts = poll.options.map((_, i) => localVotes.filter((v) => v.option_index === i).length)

  function handleVote(index: number) {
    if (isPending || isEnded) return
    startTransition(async () => {
      const isChange = selected !== null && selected !== index
      const result = await (isChange
        ? changeVote(poll.id, index, postId, courseId)
        : votePoll(poll.id, index, postId, courseId))

      if (result?.error) {
        toast.error(result.error)
      } else {
        setLocalVotes((prev) => {
          const without = prev.filter((v) => v.user_id !== currentUserId)
          return [...without, { option_index: index, user_id: currentUserId }]
        })
        setSelected(index)
      }
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
            <BarChart2 className="w-3 h-3" />
            Enquete
          </span>
          {isEnded && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />
              Encerrada
            </span>
          )}
        </div>
        <p className="text-base font-semibold text-foreground leading-snug">{poll.question}</p>
        {!hasVoted && !isEnded && (
          <p className="text-xs text-muted-foreground mt-1.5">Escolha uma opção para votar</p>
        )}
      </div>

      {/* Options */}
      <div className="px-5 pb-2 space-y-2.5">
        {poll.options.map((option, i) => {
          const count = counts[i]
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isMyVote = selected === i
          const showResults = hasVoted || isEnded

          if (showResults) {
            return (
              <button
                key={i}
                onClick={() => handleVote(i)}
                disabled={isPending || isEnded}
                className={cn(
                  'relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200',
                  isMyVote
                    ? 'border-primary shadow-sm shadow-primary/20'
                    : 'border-border hover:border-primary/40 disabled:hover:border-border'
                )}
              >
                {/* Progress bar */}
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-700 ease-out',
                    isMyVote ? 'bg-primary/20' : 'bg-muted/70'
                  )}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      isMyVote
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    )}>
                      {isMyVote && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className={cn('text-sm truncate', isMyVote ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {option}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn('text-sm font-bold', isMyVote ? 'text-primary' : 'text-muted-foreground')}>
                      {pct}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">({count})</span>
                  </div>
                </div>
              </button>
            )
          }

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={isPending}
              className="group w-full text-left rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10 active:scale-[0.99] transition-all duration-150 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-primary transition-colors shrink-0 flex items-center justify-center">
                {isPending ? <Spinner className="w-3 h-3" /> : null}
              </div>
              <span className="text-sm font-medium text-foreground">{option}</span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 mt-1 border-t border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}</span>
        </div>
        {hasVoted && !isEnded && (
          <p className="text-xs text-muted-foreground">Clique em outra opção para mudar seu voto</p>
        )}
      </div>
    </div>
  )
}
