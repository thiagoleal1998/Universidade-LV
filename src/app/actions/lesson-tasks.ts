'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireLessonAccess } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { notifyAllAdmins, notifyUser } from '@/app/actions/notifications'

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'checkboxes' | 'file_upload'

export type TaskQuestion = {
  id: string
  task_id: string
  type: QuestionType
  question: string
  options: string[]
  correct_options: number[]
  correct_answer: string | null
  required: boolean
  order_index: number
  points: number
}

export type LessonTask = {
  id: string
  lesson_id: string
  title: string
  description: string
  questions: TaskQuestion[]
  response_count: number
}

export type TaskAnswer = {
  question_id: string
  text_answer: string | null
  option_indices: number[] | null
}

export type TaskResponse = {
  id: string
  submitted_at: string
  answers: TaskAnswer[]
  grade: number | null
  feedback: string | null
  graded_at: string | null
}

// ── Admin actions ────────────────────────────────────────────────────────────

export async function createTask(lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('lesson_tasks')
    .insert({ lesson_id: lessonId, title: 'Tarefa', description: '' })
    .select()
    .single()
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'create', entityType: 'tarefa_aula', entityId: data?.id, entityLabel: 'Tarefa', detail: `aula ${lessonId}` })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { data }
}

export async function updateTask(taskId: string, lessonId: string, title: string, description: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('lesson_tasks')
    .update({ title, description })
    .eq('id', taskId)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'update', entityType: 'tarefa_aula', entityId: taskId, entityLabel: title, detail: 'alterou: título, descrição' })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteTask(taskId: string, lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: task } = await adminClient.from('lesson_tasks').select('title').eq('id', taskId).single()
  const { error } = await adminClient.from('lesson_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'tarefa_aula', entityId: taskId, entityLabel: task?.title ?? taskId })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function addQuestion(taskId: string, lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('lesson_task_questions')
    .select('order_index')
    .eq('task_id', taskId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1
  const { data, error } = await adminClient
    .from('lesson_task_questions')
    .insert({ task_id: taskId, type: 'short_text', question: '', options: [], required: true, order_index: nextIndex, points: 1 })
    .select()
    .single()
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'create', entityType: 'pergunta_aula', entityId: data?.id, entityLabel: `tarefa ${taskId}` })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { data }
}

export async function updateQuestion(
  questionId: string,
  lessonId: string,
  payload: { type: QuestionType; question: string; options: string[]; correct_options: number[]; correct_answer: string | null; required: boolean; points: number }
) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('lesson_task_questions')
    .update(payload)
    .eq('id', questionId)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'update', entityType: 'pergunta_aula', entityId: questionId, entityLabel: payload.question || questionId })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteQuestion(questionId: string, lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: question } = await adminClient.from('lesson_task_questions').select('question').eq('id', questionId).single()
  const { error } = await adminClient.from('lesson_task_questions').delete().eq('id', questionId)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'pergunta_aula', entityId: questionId, entityLabel: question?.question || questionId })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function reorderQuestion(
  questionId: string,
  taskId: string,
  lessonId: string,
  direction: 'up' | 'down'
) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: current } = await adminClient
    .from('lesson_task_questions').select('order_index').eq('id', questionId).single()
  if (!current) return { error: 'Questão não encontrada' }
  const { data: neighbor } = await adminClient
    .from('lesson_task_questions')
    .select('id, order_index')
    .eq('task_id', taskId)
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }
  await adminClient.from('lesson_task_questions').update({ order_index: neighbor.order_index }).eq('id', questionId)
  await adminClient.from('lesson_task_questions').update({ order_index: current.order_index }).eq('id', neighbor.id)
  logActivity(ctx, { action: 'reorder', entityType: 'pergunta_aula', entityId: questionId, entityLabel: questionId, detail: `moveu para ${direction === 'up' ? 'cima' : 'baixo'}` })
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

// ── Member action ─────────────────────────────────────────────────────────────

export async function submitTaskResponse(
  taskId: string,
  lessonId: string,
  answers: { questionId: string; textAnswer?: string; optionIndices?: number[] }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: response, error: resError } = await supabase
    .from('lesson_task_responses')
    .insert({ task_id: taskId, user_id: user.id })
    .select()
    .single()
  if (resError) return { error: resError.message }

  const rows = answers.map((a) => ({
    response_id: response.id,
    question_id: a.questionId,
    text_answer:    a.textAnswer    ?? null,
    option_indices: a.optionIndices ?? null,
  }))

  const { error: ansError } = await supabase.from('lesson_task_answers').insert(rows)
  if (ansError) return { error: ansError.message }

  // Notifica todos os admins sobre nova tarefa aguardando correção
  const { data: taskData } = await supabase
    .from('lesson_tasks')
    .select('title, lessons(title)')
    .eq('id', taskId)
    .single()
  const taskTitle = (taskData as any)?.title ?? 'Tarefa'
  const lessonTitle = (taskData as any)?.lessons?.title ?? ''
  await notifyAllAdmins(user.id, {
    type: 'task_submitted',
    title: `Nova tarefa aguardando correção`,
    body: `${taskTitle}${lessonTitle ? ` · ${lessonTitle}` : ''} — enviada por um aluno.`,
    link: `/admin/aulas/${lessonId}`,
  })

  revalidatePath(`/dashboard/aulas/${lessonId}`)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function gradeTaskResponse(
  responseId: string,
  lessonId: string,
  grade: number,
  feedback: string,
  answerGrades: { questionId: string; grade: number }[] = []
) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await adminClient
    .from('lesson_task_responses')
    .update({ grade, feedback: feedback.trim() || null, graded_at: new Date().toISOString(), graded_by: user.id })
    .eq('id', responseId)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'update', entityType: 'tarefa_aula', entityId: responseId, entityLabel: `resposta ${responseId}`, detail: `nota: ${grade}/10` })

  // Salva nota por questão
  for (const ag of answerGrades) {
    await adminClient
      .from('lesson_task_answers')
      .update({ grade: ag.grade })
      .eq('response_id', responseId)
      .eq('question_id', ag.questionId)
  }

  // Notifica o aluno que recebeu sua nota
  const { data: responseData } = await adminClient
    .from('lesson_task_responses')
    .select('user_id, lesson_task:task_id(title, lesson_id)')
    .eq('id', responseId)
    .single()

  if (responseData) {
    const rd = responseData as any
    const memberId = rd.user_id
    const taskTitle = rd.lesson_task?.title ?? 'Tarefa'
    await notifyUser(memberId, {
      type: 'task_graded',
      title: `Sua tarefa foi corrigida`,
      body: `"${taskTitle}" recebeu nota ${grade}/10.`,
      link: `/dashboard/documentos/notas`,
    })
  }

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/documentos/notas`)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function uploadTaskFile(lessonId: string, file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) return { error: 'Arquivo muito grande. O limite é 10 MB.' }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${lessonId}/${user.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('task-submissions')
    .upload(path, file)

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('task-submissions')
    .getPublicUrl(path)

  return { url: publicUrl }
}
