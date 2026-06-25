'use client'

import { useState, useTransition } from 'react'
import { gradeTaskResponse } from '@/app/actions/lesson-tasks'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type Answer = {
  question_id: string
  text_answer: string | null
  option_indices: number[] | null
}

type Question = {
  id: string
  question: string
  type: string
  options: string[]
  points: number
}

type Response = {
  id: string
  user_id: string
  submitted_at: string
  grade: number | null
  feedback: string | null
  graded_at: string | null
  member_name: string
  answers: Answer[]
}

export function TaskResponsesPanel({
  responses,
  questions,
  lessonId,
}: {
  responses: Response[]
  questions: Question[]
  lessonId: string
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [grades, setGrades] = useState<Record<string, string>>(
    Object.fromEntries(responses.map((r) => [r.id, r.grade != null ? String(r.grade) : '']))
  )
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(
    Object.fromEntries(responses.map((r) => [r.id, r.feedback ?? '']))
  )
  const [isPending, startSave] = useTransition()

  const questionMap = new Map(questions.map((q) => [q.id, q]))

  function handleGrade(responseId: string) {
    const gradeVal = parseFloat(grades[responseId] ?? '')
    if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > 10) {
      toast.error('Nota deve ser entre 0 e 10')
      return
    }
    startSave(async () => {
      const r = await gradeTaskResponse(responseId, lessonId, gradeVal, feedbacks[responseId] ?? '')
      if (r?.error) toast.error(r.error)
      else { toast.success('Nota salva!'); router.refresh() }
    })
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhuma resposta enviada ainda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {responses.map((resp) => {
        const isOpen = openId === resp.id
        const hasGrade = resp.grade != null
        return (
          <div key={resp.id} className="border rounded-xl overflow-hidden bg-card">
            {/* Header */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : resp.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {resp.member_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{resp.member_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado em {new Date(resp.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasGrade ? (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 border">
                    <Star className="w-3 h-3 mr-1" />{resp.grade}/10
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-400">Aguardando correção</Badge>
                )}
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {/* Body */}
            {isOpen && (
              <div className="border-t border-border px-4 py-4 space-y-4">
                {/* Respostas */}
                {resp.answers.map((ans) => {
                  const q = questionMap.get(ans.question_id)
                  if (!q) return null
                  return (
                    <div key={ans.question_id} className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        {q.question}
                        <span className="ml-2 text-muted-foreground font-normal">({q.points} {q.points === 1 ? 'pt' : 'pts'})</span>
                      </p>
                      {ans.text_answer ? (
                        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 whitespace-pre-wrap">{ans.text_answer}</p>
                      ) : ans.option_indices?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ans.option_indices.map((i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                              {q.options[i] ?? `Opção ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem resposta</p>
                      )}
                    </div>
                  )
                })}

                {/* Correção */}
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Correção</p>
                  <div className="flex items-start gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Nota (0–10)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={grades[resp.id] ?? ''}
                        onChange={(e) => setGrades((p) => ({ ...p, [resp.id]: e.target.value }))}
                        className="w-20 border border-input rounded-lg px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
                        placeholder="0–10"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Feedback para o aluno (opcional)</label>
                      <Textarea
                        rows={2}
                        value={feedbacks[resp.id] ?? ''}
                        onChange={(e) => setFeedbacks((p) => ({ ...p, [resp.id]: e.target.value }))}
                        placeholder="Comentário sobre a resposta..."
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleGrade(resp.id)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {hasGrade ? 'Atualizar nota' : 'Salvar nota'}
                  </Button>
                  {resp.graded_at && (
                    <p className="text-xs text-muted-foreground">
                      Corrigido em {new Date(resp.graded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
