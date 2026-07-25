'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NoteState = {
  content: string        // última versão salva (é o que aparece em Documentos)
  draftContent: string   // digitado desde o último Salvar; '' quando não há rascunho
}

// Salvar de verdade: promove o texto a versão oficial e limpa o rascunho.
// Só a partir daqui a anotação aparece em Documentos → Anotações.
export async function saveNote(lessonId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('lesson_notes')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        content,
        draft_content: null,
        is_draft: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  revalidatePath('/dashboard/documentos/anotacoes')
  return { success: true }
}

// Rascunho: guarda o que está sendo digitado sem tocar na versão salva e sem
// mexer em updated_at — Documentos ordena por essa data, e rascunho não deve
// reordenar a lista. Sem revalidatePath: roda a cada pausa na digitação.
export async function saveNoteDraft(lessonId: string, draftContent: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: existing } = await supabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  // Rascunho igual ao que já está salvo não é rascunho — evita marcar "não
  // salvo" só porque o aluno digitou e desfez.
  const isSameAsSaved = (existing?.content ?? '') === draftContent

  const { error } = await supabase
    .from('lesson_notes')
    .upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        content: existing?.content ?? '',
        draft_content: isSameAsSaved ? null : draftContent,
        is_draft: !isSameAsSaved,
      },
      { onConflict: 'user_id,lesson_id' }
    )

  if (error) return { error: error.message }
  return { success: true }
}

// Descarta o rascunho e volta para a última versão salva.
export async function discardNoteDraft(lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('lesson_notes')
    .update({ draft_content: null, is_draft: false })
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function getNote(lessonId: string): Promise<NoteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { content: '', draftContent: '' }

  const { data } = await supabase
    .from('lesson_notes')
    .select('content, draft_content, is_draft')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  return {
    content: data?.content ?? '',
    draftContent: data?.is_draft ? (data?.draft_content ?? '') : '',
  }
}
