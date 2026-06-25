'use client'

import { useState, useTransition } from 'react'
import { gradeTaskResponse } from '@/app/actions/lesson-tasks'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, ChevronDown, ChevronUp, Star, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type Answer = {
  question_id: string
  text_answer: string | null
  option_indices: number[] | null
  grade: number | null
}

type Question = {
  id: string
  question: string
  type: string
  options: string[]
  correct_options: number[]
  correct_answer: string | null
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

  // Nota total por resposta
  const [grades, setGrades] = useState<Record<string, string>>(
    Object.fromEntries(responses.map((r) => [r.id, r.grade != null ? String(r.grade) : '']))
  )
  // Nota por questão: [responseId][questionId]
  const [answerGrades, setAnswerGrades] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(
      responses.map((r) => [
        r.id,
        Object.fromEntries(
          r.answers.map((a) => [a.question_id, a.grade != null ? String(a.grade) : ''])
        ),
      ])
    )
  )
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(
    Object.fromEntries(responses.map((r) => [r.id, r.feedback ?? '']))
  )
  const [isPending, startSave] = useTransition()

  const questionMap = new Map(questions.map((q) => [q.id, q]))
  const isTextType = (type: string) => type === 'short_text' || type === 'long_text'

  function handleAnswerGradeChange(responseId: string, questionId: string, val: string) {
    const updated = { ...(answerGrades[responseId] ?? {}), [questionId]: val }
    setAnswerGrades((p) => ({ ...p, [responseId]: updated }))
    // Auto-soma para preencher nota total
    let total = 0
    for (const v of Object.values(updated)) {
      const n = parseFloat(v)
      if (!isNaN(n)) total += n
    }
    const capped = Math.min(total, 10)
    setGrades((p) => ({ ...p, [responseId]: capped % 1 === 0 ? String(capped) : capped.toFixed(1) }))
  }

  function autoTotal(responseId: string): number {
    const qGrades = answerGrades[responseId] ?? {}
    let total = 0
    for (const v of Object.values(qGrades)) {
      const n = parseFloat(v)
      if (!isNaN(n)) total += n
    }
    return Math.min(total, 10)
  }

  function handleGrade(responseId: string) {
    const gradeVal = parseFloat(grades[responseId] ?? '')
    if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > 10) {
      toast.error('Nota deve ser entre 0 e 10')
      return
    }
    const qGrades = Object.entries(answerGrades[responseId] ?? {})
      .map(([questionId, val]) => ({ questionId, grade: parseFloat(val) || 0 }))
      .filter((ag) => !isNaN(ag.grade))

    startSave(async () => {
      const r = await gradeTaskResponse(responseId, lessonId, gradeVal, feedbacks[responseId] ?? '', qGrades)
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
        const auto = autoTotal(resp.id)
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
                    {new Date(resp.submitted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
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
              <div className="border-t border-border px-4 py-4 space-y-5">

                {/* Respostas + nota por questão */}
                {resp.answers.map((ans) => {
                  const q = questionMap.get(ans.question_id)
                  if (!q) return null
                  const isText = isTextType(q.type)
                  const maxPts = q.points
                  const qGradeVal = answerGrades[resp.id]?.[ans.question_id] ?? ''

                  return (
                    <div key={ans.question_id} className="space-y-2">
                      {/* Cabeçalho da questão */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground leading-snug flex-1">
                          {q.question}
                          <span className="ml-2 text-muted-foreground font-normal">({maxPts} {maxPts === 1 ? 'pt' : 'pts'})</span>
                        </p>
                        {/* Input de nota por questão */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Nota:</label>
                          <input
                            type="number"
                            min={0}
                            max={maxPts}
                            step={0.5}
                            value={qGradeVal}
                            onChange={(e) => handleAnswerGradeChange(resp.id, ans.question_id, e.target.value)}
                            className="w-16 border border-input rounded-lg px-2 py-1 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
                            placeholder={`0–${maxPts}`}
                          />
                          <span className="text-xs text-muted-foreground">/ {maxPts}</span>
                        </div>
                      </div>

                      {/* Resposta do aluno */}
                      {ans.text_answer ? (
                        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 whitespace-pre-wrap">{ans.text_answer}</p>
                      ) : ans.option_indices?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ans.option_indices.map((i) => {
                            const isCorrect = q.correct_options?.includes(i)
                            return (
                              <span key={i} className={cn(
                                'text-xs px-2 py-0.5 rounded-full border',
                                isCorrect
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
                                  : 'bg-primary/10 text-primary border-primary/20'
                              )}>
                                {q.options[i] ?? `Opção ${i + 1}`}
                              </span>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem resposta</p>
                      )}

                      {/* Gabarito texto */}
                      {isText && q.correct_answer && (
                        <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                          <BookOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Resposta esperada</p>
                            <p className="text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap">{q.correct_answer}</p>
                          </div>
                        </div>
                      )}

                      {/* Gabarito múltipla escolha / checkboxes */}
                      {(q.type === 'multiple_choice' || q.type === 'checkboxes') && q.correct_options?.length > 0 && (
                        <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                          <BookOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0 mt-1" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1.5">
                              {q.correct_options.length === 1 ? 'Resposta correta' : 'Respostas corretas'}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {q.correct_options.map((i) => (
                                <span key={i} className="text-xs bg-green-500/15 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-400/40">
                                  {q.options[i] ?? `Opção ${i + 1}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Correção — nota total + feedback */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Nota Final</p>
                    {auto > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Soma automática: <span className="font-semibold text-foreground">{auto % 1 === 0 ? auto : auto.toFixed(1)}</span>/10
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Nota geral (0–10)</label>
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
