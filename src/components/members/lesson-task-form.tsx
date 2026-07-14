'use client'

import { useState, useTransition, useRef } from 'react'
import { submitTaskResponse, uploadTaskFile } from '@/app/actions/lesson-tasks'
import type { LessonTask, TaskQuestion, TaskResponse } from '@/app/actions/lesson-tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ClipboardList, CheckCircle2, Eye, CalendarClock, CalendarCheck2, CalendarX2, Clock, Paperclip, Upload, X, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Task date status ─────────────────────────────────────────────────────────

type DateStatus = 'upcoming' | 'active' | 'closing_soon' | 'expired' | null

function getDateStatus(startDate: string | null | undefined, endDate: string | null | undefined): DateStatus {
  if (!startDate && !endDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  const end = endDate ? new Date(endDate + 'T00:00:00') : null
  if (start && today < start) return 'upcoming'
  if (end && today > end) return 'expired'
  if (end) {
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 3) return 'closing_soon'
  }
  return 'active'
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function TaskDateBanner({
  startDate,
  endDate,
}: {
  startDate: string | null | undefined
  endDate: string | null | undefined
}) {
  if (!startDate && !endDate) return null
  const status = getDateStatus(startDate, endDate)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = endDate
    ? Math.ceil((new Date(endDate + 'T00:00:00').getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const config = {
    upcoming: {
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: <CalendarClock className="w-5 h-5 shrink-0" />,
      label: startDate ? `Disponível a partir de ${formatDate(startDate)}` : 'Em breve',
      sub: endDate ? `Prazo até ${formatDate(endDate)}` : null,
    },
    active: {
      bg: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      icon: <CalendarCheck2 className="w-5 h-5 shrink-0" />,
      label: endDate ? `Prazo: até ${formatDate(endDate)}` : (startDate ? `Aberta desde ${formatDate(startDate)}` : 'Aberta'),
      sub: daysLeft !== null ? (daysLeft === 0 ? 'Encerra hoje!' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`) : null,
    },
    closing_soon: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: <Clock className="w-5 h-5 shrink-0" />,
      label: endDate ? `Prazo encerrando: ${formatDate(endDate)}` : 'Encerrando em breve',
      sub: daysLeft !== null ? (daysLeft === 0 ? 'Encerra hoje!' : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`) : null,
    },
    expired: {
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: <CalendarX2 className="w-5 h-5 shrink-0" />,
      label: endDate ? `Prazo encerrado em ${formatDate(endDate)}` : 'Prazo encerrado',
      sub: 'Você ainda pode enviar sua resposta.',
    },
  } as const

  if (!status) return null
  const c = config[status]

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', c.bg)}>
      <span className={c.text}>{c.icon}</span>
      <div className="min-w-0">
        <p className={cn('font-semibold text-sm leading-tight', c.text)}>{c.label}</p>
        {c.sub && <p className={cn('text-xs mt-0.5 opacity-80', c.text)}>{c.sub}</p>}
      </div>
    </div>
  )
}

// ── Submitted (read-only) view ────────────────────────────────────────────────

function SubmittedView({ task, response }: { task: LessonTask; response: TaskResponse }) {
  const sorted = [...task.questions].sort((a, b) => a.order_index - b.order_index)

  function getAnswer(q: TaskQuestion) {
    const a = response.answers.find((ans) => ans.question_id === q.id)
    if (!a) return null
    if (a.text_answer) return a.text_answer
    if (a.option_indices && q.options.length) {
      return a.option_indices.map((i) => q.options[i]).filter(Boolean).join(', ')
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-semibold text-sm">Tarefa concluída</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(response.submitted_at).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {sorted.map((q, i) => {
        const answer = getAnswer(q)
        const isFile = q.type === 'file_upload'
        return (
          <div key={q.id} className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {i + 1}. {q.question || 'Sem título'}
              {q.required && <span className="text-destructive ml-0.5">*</span>}
            </p>
            {isFile && answer ? (
              <a
                href={answer}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline rounded-lg px-3 py-2 bg-muted/50"
              >
                <FileText className="w-4 h-4 shrink-0" />
                {decodeURIComponent(answer.split('/').pop() ?? 'Arquivo enviado')}
              </a>
            ) : (
              <p className={cn(
                'text-sm rounded-lg px-3 py-2 bg-muted/50',
                !answer && 'text-muted-foreground italic'
              )}>
                {answer ?? (isFile ? 'Nenhum arquivo enviado' : 'Não respondida')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Fillable form ─────────────────────────────────────────────────────────────

export function LessonTaskForm({
  task,
  lessonId,
  initialResponse,
  isAdminPreview = false,
  taskStartDate = null,
  taskEndDate = null,
}: {
  task: LessonTask
  lessonId: string
  initialResponse: TaskResponse | null
  isAdminPreview?: boolean
  taskStartDate?: string | null
  taskEndDate?: string | null
}) {
  const [submitted, setSubmitted] = useState(!!initialResponse)
  const [response, setResponse] = useState<TaskResponse | null>(initialResponse)
  const [isPending, startTransition] = useTransition()

  // State: text answers and checkbox/radio answers keyed by question ID
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, number[]>>({})

  // File upload state keyed by question ID
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleFileSelect(qId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O limite é 10 MB.')
      return
    }
    setUploadingIds((prev) => new Set(prev).add(qId))
    const r = await uploadTaskFile(lessonId, file)
    setUploadingIds((prev) => { const s = new Set(prev); s.delete(qId); return s })
    if (r?.error) {
      toast.error(r.error)
    } else if (r.url) {
      setFileUrls((prev) => ({ ...prev, [qId]: r.url! }))
      setFileNames((prev) => ({ ...prev, [qId]: file.name }))
      toast.success('Arquivo anexado!')
    }
  }

  function removeFile(qId: string) {
    setFileUrls((prev) => { const n = { ...prev }; delete n[qId]; return n })
    setFileNames((prev) => { const n = { ...prev }; delete n[qId]; return n })
    if (fileInputRefs.current[qId]) fileInputRefs.current[qId]!.value = ''
  }

  const sorted = [...task.questions].sort((a, b) => a.order_index - b.order_index)

  function handleSingleChoice(qId: string, idx: number) {
    setChoiceAnswers((prev) => ({ ...prev, [qId]: [idx] }))
  }

  function handleMultiChoice(qId: string, idx: number, checked: boolean) {
    setChoiceAnswers((prev) => {
      const current = prev[qId] ?? []
      return {
        ...prev,
        [qId]: checked
          ? [...current, idx].sort()
          : current.filter((i) => i !== idx),
      }
    })
  }

  function validate(): string | null {
    if (uploadingIds.size > 0) return 'Aguarde o upload do arquivo terminar.'
    for (const q of sorted) {
      if (!q.required) continue
      const label = q.question || `Pergunta ${sorted.indexOf(q) + 1}`
      if (q.type === 'short_text' || q.type === 'long_text') {
        if (!textAnswers[q.id]?.trim()) return `Responda a pergunta: "${label}"`
      }
      if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
        if (!choiceAnswers[q.id]?.length) return `Selecione uma opção em: "${label}"`
      }
      if (q.type === 'file_upload') {
        if (!fileUrls[q.id]) return `Anexe um arquivo na pergunta: "${label}"`
      }
    }
    return null
  }

  function handleSubmit() {
    const err = validate()
    if (err) { toast.error(err); return }

    const answers = sorted.map((q) => ({
      questionId: q.id,
      textAnswer: (q.type === 'short_text' || q.type === 'long_text')
        ? (textAnswers[q.id] ?? '')
        : q.type === 'file_upload'
          ? (fileUrls[q.id] ?? '')
          : undefined,
      optionIndices: (q.type === 'multiple_choice' || q.type === 'checkboxes') ? (choiceAnswers[q.id] ?? []) : undefined,
    }))

    startTransition(async () => {
      const r = await submitTaskResponse(task.id, lessonId, answers)
      if (r?.error) {
        toast.error(r.error)
      } else {
        toast.success('Tarefa enviada!')
        // Build local response for immediate display
        const now = new Date().toISOString()
        setResponse({
          id: 'local',
          submitted_at: now,
          grade: null,
          feedback: null,
          graded_at: null,
          answers: answers.map((a) => ({
            question_id: a.questionId,
            text_answer: a.textAnswer ?? null,
            option_indices: a.optionIndices ?? null,
          })),
        })
        setSubmitted(true)
      }
    })
  }

  if (isAdminPreview && task.questions.length === 0) {
    return (
      <div className="border border-dashed rounded-xl p-5 text-center text-sm text-muted-foreground">
        Tarefa criada mas sem perguntas. Adicione perguntas no painel admin.
      </div>
    )
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Admin preview banner */}
      {isAdminPreview && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            Pré-visualização — administradores não respondem tarefas
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary/5 border-b border-primary/20 px-5 py-4 flex items-start gap-3">
        <ClipboardList className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-foreground">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <TaskDateBanner startDate={taskStartDate} endDate={taskEndDate} />

        {submitted && response ? (
          <SubmittedView task={task} response={response} />
        ) : (
          <>
            {sorted.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {i + 1}. {q.question || 'Sem título'}
                  {q.required && <span className="text-destructive ml-0.5">*</span>}
                </p>

                {q.type === 'short_text' && (
                  <Input
                    placeholder="Sua resposta"
                    value={textAnswers[q.id] ?? ''}
                    onChange={(e) => setTextAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  />
                )}

                {q.type === 'long_text' && (
                  <Textarea
                    placeholder="Sua resposta"
                    rows={4}
                    value={textAnswers[q.id] ?? ''}
                    onChange={(e) => setTextAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  />
                )}

                {q.type === 'multiple_choice' && (
                  <div className="space-y-1.5">
                    {q.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="radio"
                          name={q.id}
                          checked={(choiceAnswers[q.id] ?? [])[0] === idx}
                          onChange={() => handleSingleChoice(q.id, idx)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'checkboxes' && (
                  <div className="space-y-1.5">
                    {q.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={(choiceAnswers[q.id] ?? []).includes(idx)}
                          onChange={(e) => handleMultiChoice(q.id, idx, e.target.checked)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'file_upload' && (
                  <div className="space-y-2">
                    {fileUrls[q.id] ? (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-muted/40">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">{fileNames[q.id]}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(q.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Remover arquivo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                        uploadingIds.has(q.id)
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      )}>
                        {uploadingIds.has(q.id) ? (
                          <>
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">Enviando…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">Clique para selecionar um arquivo</span>
                            <span className="text-xs text-muted-foreground">Máximo 10 MB</span>
                          </>
                        )}
                        <input
                          ref={(el) => { fileInputRefs.current[q.id] = el }}
                          type="file"
                          className="hidden"
                          disabled={uploadingIds.has(q.id)}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleFileSelect(q.id, f)
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}

            {!isAdminPreview && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="gap-2"
              >
                {isPending && <Spinner className="w-4 h-4" />}
                Enviar tarefa
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
