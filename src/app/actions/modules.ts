'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireCourseAccess, requireModuleAccess } from '@/lib/authz'
import { revalidatePath } from 'next/cache'
import { notifyCourseMembers } from '@/app/actions/notifications'

// Mutações usam adminClient após o guard (RLS de modules é admin-only).
// Módulo herda o dono via course_id — módulo sem curso é global (admin-only).

export async function createModule(formData: FormData) {
  const course_id = (formData.get('course_id') as string) || null

  const ctx = course_id ? await requireCourseAccess(course_id) : await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { data: modules } = await adminClient
    .from('modules')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (modules?.[0]?.order_index ?? -1) + 1

  const { data, error } = await adminClient
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
  const ctx = await requireModuleAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const is_published = formData.get('is_published') === 'true'
  const prerequisite_raw = formData.get('prerequisite_module_id') as string | null
  const prerequisite_module_id = prerequisite_raw && prerequisite_raw !== 'none' ? prerequisite_raw : null

  const { data: prev } = await adminClient
    .from('modules')
    .select('is_published, course_id')
    .eq('id', id)
    .single()

  const { error } = await adminClient
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
  const ctx = await requireModuleAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('modules').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/modulos')
  revalidatePath('/dashboard')
  return { success: true }
}

// Reorder é admin-only: a listagem do colaborador é parcial e reordenar um
// subconjunto bagunçaria os índices globais.
export async function reorderModule(id: string, direction: 'up' | 'down') {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()

  const { data: current } = await adminClient
    .from('modules').select('order_index').eq('id', id).single()
  if (!current) return { error: 'Módulo não encontrado' }

  const { data: neighbor } = await adminClient
    .from('modules')
    .select('id, order_index')
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await adminClient.from('modules').update({ order_index: neighbor.order_index }).eq('id', id)
  await adminClient.from('modules').update({ order_index: current.order_index }).eq('id', neighbor.id)

  revalidatePath('/admin/modulos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleModulePublished(id: string, is_published: boolean) {
  const ctx = await requireModuleAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: mod } = await adminClient
    .from('modules')
    .select('title, course_id, is_published')
    .eq('id', id)
    .single()

  const { error } = await adminClient
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
