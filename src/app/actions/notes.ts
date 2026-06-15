'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveNote(lessonId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('lesson_notes')
    .upsert(
      { user_id: user.id, lesson_id: lessonId, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function getNote(lessonId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data } = await supabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  return data?.content ?? ''
}
