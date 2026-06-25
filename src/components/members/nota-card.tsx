'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Star, ClipboardCheck, MessageSquare, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, BookOpen, Minus,
} from 'lucide-react'
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
  order_index: number
}

export type NotaData = {
  id: string
  grade: number
  feedback: string | null
  graded_at: string | null
  submitted_at: string
  taskTitle: string
  lessonTitle: string
  lessonId: string
  answers: Answer[]
  questions: Question[]
}

function gradeColor(grade: number) {
  if (grade >= 7) return 'text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/30'
  if (grade >= 5) return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
  return 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/30'
}

function questionScoreColor(grade: number | null, max: number) {
  if (grade === null) return ''
  if (grade >= max) return 'text-green-700 dark:text-green-400'
  if (grade > 0)    return 'text-amber-700 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function NotaCard({ nota }: { nota: NotaData }) {
  const [open, setOpen] = useState(false)

  const sortedQuestions = [...nota.questions].sort((a, b) => a.order_index - b.order_index)
  const answerMap = new Map(nota.answers.map((a) => [a.question_id, a]))

  const grade = nota.grade
  const hasDetails = nota.answers.length > 0 && nota.questions.length > 0

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Card header */}
      <div className="p-4 flex items-start gap-4">
        <div className={cn(
          'flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border font-bold text-lg',
          gradeColor(grade)
        )}>
          <span className="tabular-nums leading-none">{grade % 1 === 0 ? grade : grade.toFixed(1)}</span>
          <span className="text-xs font-normal opacity-70 leading-none mt-0.5">/10</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{nota.taskTitle}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ClipboardCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{nota.lessonTitle}</p>
              </div>
            </div>
            <Link
              href={`/dashboard/aulas/${nota.lessonId}?tab=tarefa`}
              className="shrink-0 text-xs text-primary hover:underline"
            >
              Ver aula →
            </Link>
          </div>

          {nota.feedback && (
            <div className="mt-2.5 flex items-start gap-1.5 bg-muted/40 rounded-lg px-3 py-2">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{nota.feedback}</p>
            </div>
          )}

          {nota.graded_at && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Corrigido em {new Date(nota.graded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Toggle de detalhes */}
      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            {open ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Ocultar correção</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Ver correção detalhada</>
            )}
          </button>

          {open && (
            <div className="border-t border-border px-4 py-4 space-y-5 bg-muted/20">
              {sortedQuestions.map((q, idx) => {
                const ans = answerMap.get(q.id)
                const isChoice = q.type === 'multiple_choice' || q.type === 'checkboxes'
                const isText = q.type === 'short_text' || q.type === 'long_text'
                const qGrade = ans?.grade ?? null
                const hasGrade = qGrade !== null

                return (
                  <div key={q.id} className="space-y-2">
                    {/* Título da questão + pontuação */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-snug flex-1">
                        {idx + 1}. {q.question}
                      </p>
                      {hasGrade && (
                        <span className={cn(
                          'shrink-0 text-xs font-bold tabular-nums',
                          questionScoreColor(qGrade, q.points)
                        )}>
                          {qGrade % 1 === 0 ? qGrade : qGrade.toFixed(1)}/{q.points}
                        </span>
                      )}
                    </div>

                    {/* Resposta do aluno */}
                    {!ans ? (
                      <p className="text-xs text-muted-foreground italic">Sem resposta registrada</p>
                    ) : isText ? (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground bg-background border border-border rounded-lg px-3 py-2 whitespace-pre-wrap">
                          {ans.text_answer || <span className="italic text-muted-foreground">Sem resposta</span>}
                        </p>
                        {q.correct_answer && (
                          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                            <BookOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-0.5">Resposta esperada</p>
                              <p className="text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap">{q.correct_answer}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isChoice ? (
                      <div className="space-y-1.5">
                        {q.options.map((opt, i) => {
                          const selected = ans.option_indices?.includes(i) ?? false
                          const correct  = q.correct_options?.includes(i) ?? false
                          const wrong    = selected && !correct
                          const missed   = !selected && correct
                          if (!selected && !correct) return null
                          return (
                            <div key={i} className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border',
                              selected && correct  && 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300',
                              wrong                && 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400',
                              missed               && 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300',
                            )}>
                              {selected && correct  && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" />}
                              {wrong                && <XCircle      className="w-3.5 h-3.5 shrink-0 text-red-500"                      />}
                              {missed               && <Minus        className="w-3.5 h-3.5 shrink-0 text-amber-500"                    />}
                              <span>{opt}</span>
                              {missed && <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400">correta</span>}
                            </div>
                          )
                        })}
                      </div>
                    ) : q.type === 'file_upload' ? (
                      <p className="text-xs text-muted-foreground italic">Envio de arquivo</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
