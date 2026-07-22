'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireCourseAccess, requireAdmin } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

// Mutações usam adminClient após o guard (RLS de courses é admin-only; para
// colaborador a mutação via client de sessão falharia silenciosamente).

export async function createCourse(formData: FormData) {
  const ctx = await requireCapability('courses')
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const name = formData.get('name') as string

  const { data: existing } = await adminClient
    .from('courses')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error } = await adminClient
    .from('courses')
    .insert({ name, order_index: nextIndex, owner_area_id: ctx.areaId })
    .select('id')
    .single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'curso', entityLabel: name, entityId: inserted?.id })

  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCourse(courseId: string, formData: FormData) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || ''
  const is_published = formData.get('is_published') === 'true'
  const instructor_name = (formData.get('instructor_name') as string) || null
  const instructor_role = (formData.get('instructor_role') as string) || null
  const instructor_profile_id = (formData.get('instructor_profile_id') as string) || null

  const { data: before } = await adminClient
    .from('courses')
    .select('name, description, is_published, instructor_name, instructor_role, instructor_profile_id')
    .eq('id', courseId)
    .single()

  const after = { name, description, is_published, instructor_name, instructor_role, instructor_profile_id }
  const { error } = await adminClient
    .from('courses')
    .update(after)
    .eq('id', courseId)

  if (error) return { error: error.message }

  const changed = diffFields(before ?? {}, after, {
    name: 'título', description: 'descrição', is_published: 'publicação',
    instructor_name: 'nome do instrutor', instructor_role: 'cargo do instrutor',
    instructor_profile_id: 'instrutor vinculado',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'curso', entityId: courseId, entityLabel: name, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadInstructorPhoto(courseId: string, file: File) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  const path = `${courseId}/instructor-${Date.now()}.webp`

  const { error: uploadError } = await adminClient.storage
    .from('course-covers')
    .upload(path, webpFile, { upsert: true, contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage.from('course-covers').getPublicUrl(path)

  const { data: course } = await adminClient.from('courses').select('name').eq('id', courseId).single()
  const { error } = await adminClient.from('courses').update({ instructor_photo_url: publicUrl }).eq('id', courseId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'upload', entityType: 'curso', entityId: courseId, entityLabel: course?.name ?? courseId, detail: `foto do instrutor: ${file.name}` })

  revalidatePath(`/admin/cursos/${courseId}`)
  return { success: true, url: publicUrl }
}

export async function toggleCoursePublished(courseId: string, is_published: boolean) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: course } = await adminClient.from('courses').select('name').eq('id', courseId).single()
  const { error } = await adminClient.from('courses').update({ is_published }).eq('id', courseId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'curso', entityId: courseId, entityLabel: course?.name ?? courseId, detail: is_published ? 'publicou' : 'despublicou' })

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteCourse(courseId: string) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: course } = await adminClient.from('courses').select('name').eq('id', courseId).single()

  // Detach modules from this course before deleting
  await adminClient.from('modules').update({ course_id: null }).eq('course_id', courseId)

  const { error } = await adminClient.from('courses').delete().eq('id', courseId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'curso', entityId: courseId, entityLabel: course?.name ?? courseId })

  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadCourseCover(courseId: string, file: File) {
  const ctx = await requireCourseAccess(courseId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const path = `${courseId}/${Date.now()}.webp`

  const { error: uploadError } = await adminClient.storage
    .from('course-covers')
    .upload(path, webpFile, { upsert: true, contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage.from('course-covers').getPublicUrl(path)

  const { data: course } = await adminClient.from('courses').select('name').eq('id', courseId).single()
  const { error } = await adminClient.from('courses').update({ cover_image_url: publicUrl }).eq('id', courseId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'upload', entityType: 'curso', entityId: courseId, entityLabel: course?.name ?? courseId, detail: `capa: ${file.name}` })

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true, url: publicUrl }
}

// Reorder é admin-only: a listagem do colaborador é parcial (só a área dele),
// e reordenar um subconjunto bagunçaria os índices globais.
export async function reorderCourse(courseId: string, direction: 'up' | 'down') {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()

  const { data: current } = await adminClient
    .from('courses').select('order_index, name').eq('id', courseId).single()
  if (!current) return { error: 'Curso não encontrado' }

  const { data: neighbor } = await adminClient
    .from('courses')
    .select('id, order_index')
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await adminClient.from('courses').update({ order_index: neighbor.order_index }).eq('id', courseId)
  await adminClient.from('courses').update({ order_index: current.order_index }).eq('id', neighbor.id)

  logActivity(auth, { action: 'reorder', entityType: 'curso', entityId: courseId, entityLabel: current.name ?? courseId, detail: `moveu para ${direction === 'up' ? 'cima' : 'baixo'}` })

  revalidatePath('/admin/cursos')
  return { success: true }
}
