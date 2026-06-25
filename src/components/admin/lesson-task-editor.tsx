'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createTask, updateTask, deleteTask,
  addQuestion, updateQuestion, deleteQuestion, reorderQuestion,
} from '@/app/actions/lesson-tasks'
import type { LessonTask, TaskQuestion, QuestionType } from '@/app/actions/lesson-tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ClipboardList, Plus, Trash2, ChevronUp, ChevronDown,
  CheckSquare, Circle, Type, AlignLeft, Users, Paperclip, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text:      'Resposta curta',
  long_text:       'Parágrafo',
  multiple_choice: 'Múltipla escolha',
  checkboxes:      'Caixas de seleção',
  file_upload:     'Envio de arquivo',
}

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  short_text:      <Type className="w-3.5 h-3.5" />,
  long_text:       <AlignLeft className="w-3.5 h-3.5" />,
  multiple_choice: <Circle className="w-3.5 h-3.5" />,
  checkboxes:      <CheckSquare className="w-3.5 h-3.5" />,
  file_upload:     <Paperclip className="w-3.5 h-3.5" />,
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({
  q, taskId, lessonId, isFirst, isLast, index, onPointsChange,
}: {
  q: TaskQuestion
  taskId: string
  lessonId: string
  isFirst: boolean
  isLast: boolean
  index: number
  onPointsChange: (id: string, pts: number) => void
}) {
  const router = useRouter()
  const [questionText, setQuestionText] = useState(q.question)
  const [type, setType] = useState<QuestionType>(q.type)
  const [options, setOptions] = useState<string[]>(q.options.length ? q.options : [''])
  const [correctOptions, setCorrectOptions] = useState<number[]>(q.correct_options ?? [])
  const [correctAnswer, setCorrectAnswer] = useState<string>(q.correct_answer ?? '')
  const [required, setRequired] = useState(q.required)
  const [points, setPoints] = useState<number>(q.points ?? 1)
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isReordering, startReorder] = useTransition()

  function save(
    qt: string = questionText,
    t: QuestionType = type,
    opts: string[] = options,
    correct: number[] = correctOptions,
    req: boolean = required,
    pts: number = points,
    ca: string = correctAnswer,
  ) {
    const isChoice = t === 'multiple_choice' || t === 'checkboxes'
    const cleanOpts = isChoice ? opts.filter((o) => o.trim() !== '') : []
    const cleanCorrect = isChoice ? correct.filter((i) => i < cleanOpts.length) : []
    startSave(async () => {
      const r = await updateQuestion(q.id, lessonId, {
        type: t, question: qt, options: cleanOpts, correct_options: cleanCorrect,
        correct_answer: (t === 'short_text' || t === 'long_text') ? (ca.trim() || null) : null,
        required: req, points: pts,
      })
      if (r?.error) toast.error(r.error)
    })
  }

  function handlePointsChange(val: number) {
    const clamped = Math.max(0, Math.min(10, val))
    setPoints(clamped)
    onPointsChange(q.id, clamped)
  }

  function handleTypeChange(newType: QuestionType) {
    setType(newType)
    setCorrectOptions([])
    const isText = newType === 'short_text' || newType === 'long_text'
    if (!isText) setCorrectAnswer('')
    if (newType === 'multiple_choice' || newType === 'checkboxes') {
      const opts = options.length ? options : ['']
      setOptions(opts)
      save(questionText, newType, opts, [], required, points, '')
    } else {
      save(questionText, newType, [], [], required, points, isText ? correctAnswer : '')
    }
  }

  function handleRequiredChange(val: boolean) {
    setRequired(val)
    save(questionText, type, options, correctOptions, val)
  }

  function handleOptionChange(idx: number, val: string) {
    const next = [...options]
    next[idx] = val
    setOptions(next)
  }

  function handleOptionBlur(idx: number) {
    save(questionText, type, options, correctOptions, required)
  }

  function addOption() {
    const next = [...options, '']
    setOptions(next)
  }

  function removeOption(idx: number) {
    const next = options.filter((_, i) => i !== idx)
    const nextCorrect = correctOptions
      .filter((c) => c !== idx)
      .map((c) => (c > idx ? c - 1 : c))
    setOptions(next.length ? next : [''])
    setCorrectOptions(nextCorrect)
    save(questionText, type, next.length ? next : [''], nextCorrect, required)
  }

  function toggleCorrect(idx: number) {
    let next: number[]
    if (type === 'multiple_choice') {
      next = correctOptions[0] === idx ? [] : [idx]
    } else {
      next = correctOptions.includes(idx)
        ? correctOptions.filter((c) => c !== idx)
        : [...correctOptions, idx].sort()
    }
    setCorrectOptions(next)
    save(questionText, type, options, next, required)
  }

  const isChoice = type === 'multiple_choice' || type === 'checkboxes'

  return (
    <div className={cn(
      'bg-card border rounded-xl overflow-hidden transition-all',
      isSaving && 'opacity-80'
    )}>
      {/* Question header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          {/* Reorder */}
          <div className="flex flex-col gap-0.5 mt-1 shrink-0">
            <Button
              type="button" variant="ghost" size="icon"
              className="h-5 w-6 rounded-sm text-muted-foreground"
              disabled={isFirst || isReordering}
              onClick={() => startReorder(async () => {
                const r = await reorderQuestion(q.id, taskId, lessonId, 'up')
                if (r?.error) toast.error(r.error)
                else router.refresh()
              })}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button" variant="ghost" size="icon"
              className="h-5 w-6 rounded-sm text-muted-foreground"
              disabled={isLast || isReordering}
              onClick={() => startReorder(async () => {
                const r = await reorderQuestion(q.id, taskId, lessonId, 'down')
                if (r?.error) toast.error(r.error)
                else router.refresh()
              })}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Question number + text */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">{index + 1}.</span>
              <Input
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onBlur={() => save()}
                placeholder="Pergunta"
                className="flex-1 font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-sm"
              />
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-2 pl-7">
              <select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="text-xs border border-input rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {(Object.entries(TYPE_LABELS) as [QuestionType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {isSaving && <Spinner className="w-3 h-3 text-muted-foreground" />}
            </div>
          </div>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button type="button" variant="ghost" size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                disabled={isDeleting} />
            }>
              <Trash2 className="w-4 h-4" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => startDelete(async () => {
                  const r = await deleteQuestion(q.id, lessonId)
                  if (r?.error) toast.error(r.error)
                  else router.refresh()
                })}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Options for multiple choice / checkboxes */}
        {isChoice && (
          <div className="pl-7 space-y-1.5">
            <p className="text-xs text-muted-foreground mb-2">
              Clique em <CheckCircle2 className="inline w-3 h-3 mb-0.5" /> para marcar a(s) resposta(s) correta(s)
            </p>
            {options.map((opt, i) => {
              const isCorrect = correctOptions.includes(i)
              return (
                <div key={i} className={cn('flex items-center gap-2 rounded-lg px-2 py-0.5 transition-colors', isCorrect && 'bg-green-50 dark:bg-green-950/30')}>
                  {type === 'multiple_choice'
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-sm border-2 border-muted-foreground shrink-0" />
                  }
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    onBlur={() => handleOptionBlur(i)}
                    placeholder={`Opção ${i + 1}`}
                    className="flex-1 h-7 text-sm border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                  />
                  <button
                    type="button"
                    title={isCorrect ? 'Remover gabarito' : 'Marcar como correta'}
                    onClick={() => toggleCorrect(i)}
                    className={cn(
                      'shrink-0 transition-colors',
                      isCorrect ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/40 hover:text-green-500'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  {options.length > 1 && (
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeOption(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar opção
            </button>
          </div>
        )}

        {/* Short text preview */}
        {type === 'short_text' && (
          <div className="pl-7">
            <div className="h-7 border-b border-dashed border-muted-foreground/40 text-xs text-muted-foreground/50 flex items-end pb-1">
              Resposta curta
            </div>
          </div>
        )}

        {/* Long text preview */}
        {type === 'long_text' && (
          <div className="pl-7">
            <div className="h-14 border-b border-dashed border-muted-foreground/40 text-xs text-muted-foreground/50 flex items-end pb-1">
              Resposta longa
            </div>
          </div>
        )}

        {/* Gabarito (apenas texto curto/longo) */}
        {(type === 'short_text' || type === 'long_text') && (
          <div className="pl-7 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Resposta esperada <span className="font-normal opacity-60">(gabarito para o instrutor — opcional)</span></p>
            <Textarea
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              onBlur={() => save()}
              placeholder="Descreva a resposta correta esperada. Será exibida na correção como referência."
              rows={type === 'long_text' ? 3 : 2}
              className="text-sm resize-none border-green-300 dark:border-green-800 focus-visible:ring-green-400/30 bg-green-50/40 dark:bg-green-950/20 placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {/* File upload preview */}
        {type === 'file_upload' && (
          <div className="pl-7">
            <div className="flex items-center gap-2 border border-dashed border-muted-foreground/40 rounded-lg px-3 py-2 text-xs text-muted-foreground/60">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              O membro poderá anexar um arquivo (máx. 10 MB)
            </div>
          </div>
        )}
      </div>

      {/* Footer: required + points */}
      <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => handleRequiredChange(e.target.checked)}
            className="rounded"
          />
          Obrigatória
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
          <span>Pontos:</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={points}
            onChange={(e) => handlePointsChange(parseFloat(e.target.value) || 0)}
            onBlur={() => save()}
            className="w-16 border border-input rounded-md px-2 py-0.5 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-center"
          />
        </label>
      </div>
    </div>
  )
}

// ── Task Header ───────────────────────────────────────────────────────────────

function TaskHeader({ task, lessonId }: { task: LessonTask; lessonId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function save(t = title, d = description) {
    startSave(async () => {
      const r = await updateTask(task.id, lessonId, t, d)
      if (r?.error) toast.error(r.error)
    })
  }

  return (
    <div className="bg-card border-l-4 border-primary rounded-xl overflow-hidden">
      <div className="p-5 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save()}
          placeholder="Título da tarefa"
          className="text-xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save()}
          placeholder="Descrição da tarefa (opcional)"
          rows={2}
          className="border-0 border-b rounded-none px-0 resize-none focus-visible:ring-0 focus-visible:border-primary text-sm"
        />
      </div>
      <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{task.response_count} {task.response_count === 1 ? 'resposta' : 'respostas'}</span>
          {isSaving && <Spinner className="w-3 h-3" />}
        </div>
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button type="button" variant="ghost" size="sm"
              className="text-destructive hover:text-destructive gap-1.5 text-xs"
              disabled={isDeleting} />
          }>
            <Trash2 className="w-3.5 h-3.5" />
            Excluir tarefa
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as perguntas e respostas dos membros serão excluídas. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => startDelete(async () => {
                  const r = await deleteTask(task.id, lessonId)
                  if (r?.error) toast.error(r.error)
                  else router.refresh()
                })}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export function LessonTaskEditor({ task, lessonId }: { task: LessonTask | null; lessonId: string }) {
  const router = useRouter()
  const [isCreating, startCreate] = useTransition()
  const [isAddingQ, startAddQ] = useTransition()
  const [pointsMap, setPointsMap] = useState<Record<string, number>>(
    Object.fromEntries((task?.questions ?? []).map((q) => [q.id, q.points ?? 1]))
  )
  const totalPoints = Object.values(pointsMap).reduce((s, v) => s + v, 0)
  const overLimit = totalPoints > 10

  if (!task) {
    return (
      <div className="bg-card border border-dashed rounded-xl p-6 text-center space-y-3">
        <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">Nenhuma tarefa criada para esta aula.</p>
        <Button
          type="button" variant="outline" disabled={isCreating}
          onClick={() => startCreate(async () => {
            const r = await createTask(lessonId)
            if (r?.error) toast.error(r.error)
            else router.refresh()
          })}
        >
          {isCreating ? <Spinner className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Criar tarefa
        </Button>
      </div>
    )
  }

  const sorted = [...task.questions].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-3">
      <TaskHeader task={task} lessonId={lessonId} />

      {/* Total de pontos */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 rounded-lg text-xs border',
        overLimit
          ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
          : 'bg-muted/40 border-border text-muted-foreground',
      )}>
        <span>Total de pontos das questões</span>
        <span className="font-semibold tabular-nums">
          {totalPoints.toFixed(1)} / 10{overLimit && ' ⚠ excede o máximo'}
        </span>
      </div>

      {sorted.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          taskId={task.id}
          lessonId={lessonId}
          index={i}
          isFirst={i === 0}
          isLast={i === sorted.length - 1}
          onPointsChange={(id, pts) => setPointsMap((prev) => ({ ...prev, [id]: pts }))}
        />
      ))}

      <Button
        type="button" variant="outline" className="w-full gap-2" disabled={isAddingQ}
        onClick={() => startAddQ(async () => {
          const r = await addQuestion(task.id, lessonId)
          if (r?.error) toast.error(r.error)
          else router.refresh()
        })}
      >
        {isAddingQ ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        Adicionar pergunta
      </Button>
    </div>
  )
}
