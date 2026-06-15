'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyCourseMembers } from '@/app/actions/notifications'

export async function createModule(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { data: modules } = await supabase
    .from('modules')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (modules?.[0]?.order_index ?? -1) + 1

  const course_id = (formData.get('course_id') as string) || null

  const { data, error } = await supabase
    .from('modules')
    .insert({ title, description, order_index: nextIndex, course_id })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/modulos')
  revalidatePath('/admin/cursos')
  if (course_id) revalidatePath(`/admin/cursos/${course_id}`)
  return { data }
}

export async function updateModule(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const is_published = formData.get('is_published') === 'true'
  const prerequisite_raw = formData.get('prerequisite_module_id') as string | null
  const prerequisite_module_id = prerequisite_raw && prerequisite_raw !== 'none' ? prerequisite_raw : null

  const { data: prev } = await supabase
    .from('modules')
    .select('is_published, course_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('modules')
    .update({ title, description, is_published, prerequisite_module_id })
    .eq('id', id)

  if (error) return { error: error.message }

  if (is_published && prev && !prev.is_published && prev.course_id) {
    notifyCourseMembers(prev.course_id, {
      type: 'module_published',
      title: `Novo módulo disponível: ${title}`,
      body: 'Um novo módulo foi adicionado ao seu curso. Confira!',
      link: `/dashboard/cursos/${prev.course_id}`,
    })
  }

  revalidatePath('/admin/modulos')
  revalidatePath(`/admin/modulos/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteModule(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('modules').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/modulos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function reorderModule(id: string, direction: 'up' | 'down') {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('modules').select('order_index').eq('id', id).single()
  if (!current) return { error: 'Módulo não encontrado' }

  const { data: neighbor } = await supabase
    .from('modules')
    .select('id, order_index')
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await supabase.from('modules').update({ order_index: neighbor.order_index }).eq('id', id)
  await supabase.from('modules').update({ order_index: current.order_index }).eq('id', neighbor.id)

  revalidatePath('/admin/modulos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleModulePublished(id: string, is_published: boolean) {
  const supabase = await createClient()

  const { data: mod } = await supabase
    .from('modules')
    .select('title, course_id, is_published')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('modules')
    .update({ is_published })
    .eq('id', id)

  if (error) return { error: error.message }

  if (is_published && mod && !mod.is_published && mod.course_id) {
    notifyCourseMembers(mod.course_id, {
      type: 'module_published',
      title: `Novo módulo disponível: ${mod.title}`,
      body: 'Um novo módulo foi adicionado ao seu curso. Confira!',
      link: `/dashboard/cursos/${mod.course_id}`,
    })
  }

  revalidatePath('/admin/modulos')
  revalidatePath('/dashboard')
  return { success: true }
}
