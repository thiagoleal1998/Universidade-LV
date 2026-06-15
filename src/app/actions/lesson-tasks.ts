'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'checkboxes' | 'file_upload'

export type TaskQuestion = {
  id: string
  task_id: string
  type: QuestionType
  question: string
  options: string[]
  correct_options: number[]
  required: boolean
  order_index: number
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
}

// ── Admin actions ────────────────────────────────────────────────────────────

export async function createTask(lessonId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lesson_tasks')
    .insert({ lesson_id: lessonId, title: 'Tarefa', description: '' })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { data }
}

export async function updateTask(taskId: string, lessonId: string, title: string, description: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lesson_tasks')
    .update({ title, description })
    .eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteTask(taskId: string, lessonId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function addQuestion(taskId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('lesson_task_questions')
    .select('order_index')
    .eq('task_id', taskId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1
  const { data, error } = await supabase
    .from('lesson_task_questions')
    .insert({ task_id: taskId, type: 'short_text', question: '', options: [], required: true, order_index: nextIndex })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { data }
}

export async function updateQuestion(
  questionId: string,
  lessonId: string,
  payload: { type: QuestionType; question: string; options: string[]; correct_options: number[]; required: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lesson_task_questions')
    .update(payload)
    .eq('id', questionId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteQuestion(questionId: string, lessonId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_task_questions').delete().eq('id', questionId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/aulas/${lessonId}`)
  return { success: true }
}

export async function reorderQuestion(
  questionId: string,
  taskId: string,
  lessonId: string,
  direction: 'up' | 'down'
) {
  const supabase = await createClient()
  const { data: current } = await supabase
    .from('lesson_task_questions').select('order_index').eq('id', questionId).single()
  if (!current) return { error: 'Questão não encontrada' }
  const { data: neighbor } = await supabase
    .from('lesson_task_questions')
    .select('id, order_index')
    .eq('task_id', taskId)
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }
  await supabase.from('lesson_task_questions').update({ order_index: neighbor.order_index }).eq('id', questionId)
  await supabase.from('lesson_task_questions').update({ order_index: current.order_index }).eq('id', neighbor.id)
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

  revalidatePath(`/dashboard/aulas/${lessonId}`)
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
