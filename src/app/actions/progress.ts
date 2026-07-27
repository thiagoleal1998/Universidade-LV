'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleLessonComplete(lessonId: string, completed: boolean, moduleId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (completed) {
    const { error } = await supabase
      .from('member_progress')
      .insert({ user_id: user.id, lesson_id: lessonId })

    if (error && error.code !== '23505') return { error: error.message }
  } else {
    const { error } = await supabase
      .from('member_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)

    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/aulas/${lessonId}`)
  revalidatePath('/dashboard')
  // Formato Manual interativo: a barra de progresso e o ModuleCompletionBanner
  // vivem na página do MÓDULO, não na da aula — sem isso, só atualizariam na
  // próxima navegação (o manual mantém estado otimista no cliente, mas o
  // revalidate garante consistência ao recarregar).
  if (moduleId) revalidatePath(`/dashboard/modulos/${moduleId}`)
  return { success: true }
}
