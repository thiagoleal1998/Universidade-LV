'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { COMMENT_MAX_LENGTH } from '@/lib/comments'

export async function createComment(lessonId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Comentário não pode ser vazio.' }
  if (body.length > COMMENT_MAX_LENGTH) {
    return { error: `Comentário muito longo. O limite é ${COMMENT_MAX_LENGTH} caracteres.` }
  }

  const rawParentId = (formData.get('parent_id') as string)?.trim()
  let parentId: string | null = null

  if (rawParentId) {
    // Um nível só: se a resposta aponta para outra resposta, sobe para o
    // comentário raiz dela. Também confirma que o pai é da mesma aula, senão
    // dava para pendurar resposta em comentário de qualquer outra.
    const { data: parent } = await supabase
      .from('lesson_comments')
      .select('id, parent_id, lesson_id')
      .eq('id', rawParentId)
      .single()

    if (!parent || parent.lesson_id !== lessonId) {
      return { error: 'Comentário não encontrado.' }
    }
    parentId = parent.parent_id ?? parent.id
  }

  const { error } = await supabase
    .from('lesson_comments')
    .insert({ lesson_id: lessonId, user_id: user.id, body, parent_id: parentId })

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
