'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyUser, notifyAllAdmins } from '@/app/actions/notifications'
import { requireAdmin } from '@/lib/authz'
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
    notifyAllAdmins(user.id, {
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
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const { data: post } = await supabase.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await supabase.from('community_posts').delete().eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  return { success: true }
}

export async function togglePinPost(postId: string, pinned: boolean, courseId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const { data: post } = await supabase.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await supabase.from('community_posts').update({ is_pinned: pinned }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: pinned ? 'fixou' : 'desafixou' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function toggleLockPost(postId: string, locked: boolean, courseId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const { data: post } = await supabase.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await supabase.from('community_posts').update({ is_locked: locked }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: locked ? 'bloqueou' : 'reabriu' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function hidePost(postId: string, hidden: boolean, courseId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const { data: post } = await supabase.from('community_posts').select('title').eq('id', postId).single()
  const { error } = await supabase.from('community_posts').update({ is_hidden: hidden }).eq('id', postId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'post_comunidade', entityId: postId, entityLabel: post?.title ?? postId, detail: hidden ? 'ocultou' : 'reexibiu' })

  revalidatePath(`/dashboard/comunidade/${courseId}`)
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function hideReply(replyId: string, hidden: boolean, postId: string, courseId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const supabase = await createClient()
  const { data: reply } = await supabase.from('community_replies').select('body').eq('id', replyId).single()
  const { error } = await supabase.from('community_replies').update({ is_hidden: hidden }).eq('id', replyId)
  if (error) return { error: error.message }

  const label = (reply?.body ?? '').slice(0, 60)
  logActivity(ctx, { action: 'toggle', entityType: 'resposta_comunidade', entityId: replyId, entityLabel: label || replyId, detail: hidden ? 'ocultou' : 'reexibiu' })

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
    notifyAllAdmins(user.id, {
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
