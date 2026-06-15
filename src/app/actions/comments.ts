'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createComment(lessonId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Comentário não pode ser vazio.' }

  const { error } = await supabase
    .from('lesson_comments')
    .insert({ lesson_id: lessonId, user_id: user.id, body })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteComment(commentId: string, lessonId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('lesson_comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}
