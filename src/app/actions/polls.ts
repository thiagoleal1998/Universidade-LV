'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPoll(
  postId: string,
  courseId: string,
  question: string,
  options: string[]
) {
  const validOptions = options.map((o) => o.trim()).filter(Boolean)
  if (!question.trim() || validOptions.length < 2) {
    return { error: 'Enquete precisa de pergunta e pelo menos 2 opções' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('community_polls').insert({
    post_id: postId,
    question: question.trim(),
    options: validOptions,
  })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function votePoll(
  pollId: string,
  optionIndex: number,
  postId: string,
  courseId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('community_poll_votes').insert({
    poll_id: pollId,
    user_id: user.id,
    option_index: optionIndex,
  })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}

export async function changeVote(
  pollId: string,
  optionIndex: number,
  postId: string,
  courseId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('community_poll_votes')
    .update({ option_index: optionIndex })
    .eq('poll_id', pollId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/comunidade/${courseId}/${postId}`)
  return { success: true }
}
