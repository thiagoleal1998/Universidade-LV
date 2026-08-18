'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { COMMENT_MAX_LENGTH } from '@/lib/comments'
import { requireLessonAccess } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

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
  const { data: lesson } = await supabase.from('lessons').select('slug').eq('id', lessonId).single()
  revalidatePath(`/dashboard/aulas/${lesson?.slug ?? lessonId}`)
  return { success: true }
}

export async function deleteComment(commentId: string, lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const { data: comment } = await adminClient
    .from('lesson_comments')
    .select('id, user_id, lesson_id')
    .eq('id', commentId)
    .single()

  if (!comment || comment.lesson_id !== lessonId) return { error: 'Comentário não encontrado.' }

  // A policy de DELETE cobre autor e admin, mas NÃO colaborador dono do curso
  // — que hoje também vê o botão de excluir. Sem este guard, o delete dele
  // afetaria 0 linhas e a tela ainda mostraria sucesso.
  if (comment.user_id !== user.id) {
    const ctx = await requireLessonAccess(lessonId)
    if ('error' in ctx) return { error: 'Você não tem permissão para excluir este comentário.' }
  }

  const { error } = await adminClient.from('lesson_comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  const { data: lesson } = await adminClient.from('lessons').select('slug').eq('id', lessonId).single()
  revalidatePath(`/dashboard/aulas/${lesson?.slug ?? lessonId}`)
  return { success: true }
}

// Moderação — admin ou colaborador dono do curso da aula. Usa adminClient
// porque lesson_comments não tem policy de UPDATE: pelo client de sessão o
// update afetaria 0 linhas sem erro nenhum.
async function moderateComment(
  commentId: string,
  lessonId: string,
  patch: { is_pinned?: boolean; is_hidden?: boolean },
  detail: string,
) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()

  // Confirma que o comentário é mesmo desta aula — sem isso, o guard de uma
  // aula própria autorizaria moderar comentário de qualquer outra.
  const { data: comment } = await adminClient
    .from('lesson_comments')
    .select('id, body, lesson_id')
    .eq('id', commentId)
    .single()

  if (!comment || comment.lesson_id !== lessonId) return { error: 'Comentário não encontrado.' }

  const { error } = await adminClient.from('lesson_comments').update(patch).eq('id', commentId)
  if (error) return { error: error.message }

  logActivity(ctx, {
    action: 'toggle',
    entityType: 'comentario_aula',
    entityId: commentId,
    entityLabel: comment.body.slice(0, 60),
    detail,
  })

  const { data: lesson } = await adminClient.from('lessons').select('slug').eq('id', lessonId).single()
  revalidatePath(`/dashboard/aulas/${lesson?.slug ?? lessonId}`)
  return { success: true }
}

export async function toggleCommentPinned(commentId: string, pinned: boolean, lessonId: string) {
  return moderateComment(commentId, lessonId, { is_pinned: pinned }, pinned ? 'fixou' : 'desafixou')
}

export async function toggleCommentHidden(commentId: string, hidden: boolean, lessonId: string) {
  return moderateComment(commentId, lessonId, { is_hidden: hidden }, hidden ? 'ocultou' : 'reexibiu')
}
