'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { notifyUser, notifyCourseOwners } from '@/app/actions/notifications'
import { requireCourseAccess } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

export async function createPost(courseId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const title = (formData.get('title') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()
  if (!title) return { error: 'Título obrigatório' }

  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({ course_id: courseId, user_id: user.id, title, body: body ?? '' })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Notify admins about new post (skip if poster is admin)
  const { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profileData?.role !== 'admin' && post) {
    const posterName = profileData?.full_name || 'Um membro'
    notifyCourseOwners(courseId, user.id, {
      type: 'community_new_post',
      title: `${posterName} criou uma nova discussão`,
      body: `"${title}"`,
      link: `/admin/comunidade/${courseId}/${post.id}`,
    })
  }

  // Create poll if provided (admin only)
  const pollQuestion = (formData.get('poll_question') as string)?.trim()
  if (pollQuestion && post && profileData?.role === 'admin') {
    const options: string[] = []
    for (let i = 0; i < 4; i++) {
      const opt = (formData.get(`poll_option_${i}`) as string)?.trim()
      if (opt) options.push(opt)
    }
    if (options.length >= 2) {
      await supabase.from('community_polls').insert({
        post_id: post.id,
        question: pollQuestion,
        options,
      })
    }
  }

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  return { success: true }
}

export async function deletePost(postId: string, courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  // adminClient, não o client de sessão: a RLS de community_posts só libera
  // UPDATE/DELETE pra role='admin' (migração 011) — um colaborador dono do
  // curso passa no guard acima mas a mutação por sessão afetaria 0 linhas em
  // silêncio (mesmo gotcha de sempre). Confirmado empiricamente: fixar um
  // post como colaborador dono não persistia antes desta correção.
  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await adminClient.from('community_posts').delete().eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  return { success: true }
}

export async function togglePinPost(postId: string, pinned: boolean, courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await adminClient.from('community_posts').update({ is_pinned: pinned }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: pinned ? 'fixou' : 'desafixou' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function toggleLockPost(postId: string, locked: boolean, courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await adminClient.from('community_posts').update({ is_locked: locked }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: locked ? 'bloqueou' : 'reabriu' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function hidePost(postId: string, hidden: boolean, courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await adminClient.from('community_posts').update({ is_hidden: hidden }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: hidden ? 'ocultou' : 'reexibiu' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function hideReply(replyId: string, hidden: boolean, postId: string, courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: reply } = await adminClient.from('community_replies').select('body').eq('id', replyId).single()
  const { error } = await adminClient.from('community_replies').update({ is_hidden: hidden }).eq('id', replyId)
  if (error) return { error: error.message }

  const label = (reply?.body ?? '').slice(0, 60)
  logActivity(ctx, { action: 'toggle', entityType: 'resposta_comunidade', entityId: replyId, entityLabel: label || replyId, detail: hidden ? 'ocultou' : 'reexibiu' })

  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

// Autor solicita a exclusão da própria discussão — não é exclusão direta
// (diferente de deleteReply): fica marcada como pendente, mascarada pra
// quem não é autor/moderador (mesmo `isMaskedForViewer` de is_hidden), até
// admin/colaborador dono do curso aprovar ou recusar via resolvePostDeletion.
export async function requestPostDeletion(postId: string, courseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('user_id, title').eq('id', postId).single()
  if (!post) return { error: 'Discussão não encontrada.' }
  if (post.user_id !== user.id) return { error: 'Você só pode solicitar a exclusão da própria discussão.' }

  const { error } = await adminClient
    .from('community_posts')
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq('id', postId)
  if (error) return { error: error.message }

  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).single()
  const authorName = profile?.full_name || 'Um membro'
  notifyCourseOwners(courseId, user.id, {
    type: 'community_deletion_requested',
    title: `${authorName} solicitou exclusão de uma discussão`,
    body: `"${post.title}"`,
    link: `/admin/comunidade/${courseId}/${postId}`,
  })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

// Rede de segurança pra solicitação por engano — só o próprio autor desfaz.
export async function cancelPostDeletionRequest(postId: string, courseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient.from('community_posts').select('user_id').eq('id', postId).single()
  if (!post) return { error: 'Discussão não encontrada.' }
  if (post.user_id !== user.id) return { error: 'Você só pode cancelar a própria solicitação.' }

  const { error } = await adminClient
    .from('community_posts')
    .update({ deletion_requested_at: null })
    .eq('id', postId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

// Decisão do moderador (admin, ou colaborador dono do curso) sobre uma
// solicitação de exclusão pendente: aprovar exclui de verdade; recusar só
// limpa a marcação e o post volta a aparecer normalmente pra todos.
export async function resolvePostDeletion(postId: string, courseId: string, approve: boolean) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: post } = await adminClient
    .from('community_posts')
    .select('title, user_id, deletion_requested_at')
    .eq('id', postId)
    .single()
  if (!post?.deletion_requested_at) return { error: 'Esta discussão não tem exclusão pendente.' }

  if (approve) {
    const { error } = await adminClient.from('community_posts').delete().eq('id', postId)
    if (error) return { error: error.message }
    logActivity(ctx, { action: 'delete', entityType: 'post_comunidade', entityId: postId, entityLabel: post.title, detail: 'aprovou solicitação de exclusão' })
    notifyUser(post.user_id, {
      type: 'community_deletion_approved',
      title: 'Sua discussão foi excluída',
      body: `"${post.title}" foi excluída, conforme sua solicitação.`,
      link: `/dashboard/comunidade/${courseId}`,
    })
  } else {
    const { error } = await adminClient.from('community_posts').update({ deletion_requested_at: null }).eq('id', postId)
    if (error) return { error: error.message }
    logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post.title, detail: 'recusou solicitação de exclusão' })
    notifyUser(post.user_id, {
      type: 'community_deletion_rejected',
      title: 'Solicitação de exclusão recusada',
      body: `A exclusão de "${post.title}" foi recusada pela moderação.`,
      link: `/dashboard/comunidade/${courseId}/${postId}`,
    })
  }

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function createReply(postId: string, courseId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Resposta vazia' }

  const { error } = await supabase.from('community_replies').insert({
    post_id: postId,
    user_id: user.id,
    body,
  })

  if (error) return { error: error.message }

  // Notify post author and admins about new reply
  const { data: post } = await supabase
    .from('community_posts')
    .select('user_id, title')
    .eq('id', postId)
    .single()

  const { data: replierProfile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const replierName = replierProfile?.full_name || 'Alguém'

  if (post && post.user_id !== user.id) {
    notifyUser(post.user_id, {
      type: 'community_reply',
      title: `${replierName} respondeu sua discussão`,
      body: `"${post.title}"`,
      link: `/dashboard/comunidade/${courseId}/${postId}`,
    })
  }

  // Notify admins (skip if replier is admin)
  if (post && replierProfile?.role !== 'admin') {
    notifyCourseOwners(courseId, user.id, {
      type: 'community_new_reply',
      title: `${replierName} respondeu em uma discussão`,
      body: `"${post.title}"`,
      link: `/admin/comunidade/${courseId}/${postId}`,
    })
  }

  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function deleteReply(replyId: string, postId: string, courseId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('community_replies').delete().eq('id', replyId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}
