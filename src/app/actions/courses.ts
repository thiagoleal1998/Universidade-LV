'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'

export async function createCourse(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string

  const { data: existing } = await supabase
    .from('courses')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { error } = await supabase.from('courses').insert({ name, order_index: nextIndex })
  if (error) return { error: error.message }

  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateCourse(courseId: string, formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || ''
  const is_published = formData.get('is_published') === 'true'
  const instructor_name = (formData.get('instructor_name') as string) || null
  const instructor_role = (formData.get('instructor_role') as string) || null

  const { error } = await supabase
    .from('courses')
    .update({ name, description, is_published, instructor_name, instructor_role })
    .eq('id', courseId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadInstructorPhoto(courseId: string, file: File) {
  const supabase = await createClient()

  const webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  const path = `${courseId}/instructor-${Date.now()}.webp`

  const { error: uploadError } = await supabase.storage
    .from('course-covers')
    .upload(path, webpFile, { upsert: true, contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('course-covers').getPublicUrl(path)

  const { error } = await supabase.from('courses').update({ instructor_photo_url: publicUrl }).eq('id', courseId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/cursos/${courseId}`)
  return { success: true, url: publicUrl }
}

export async function toggleCoursePublished(courseId: string, is_published: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('courses').update({ is_published }).eq('id', courseId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient()

  // Detach modules from this course before deleting
  await supabase.from('modules').update({ course_id: null }).eq('course_id', courseId)

  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) return { error: error.message }

  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadCourseCover(courseId: string, file: File) {
  const supabase = await createClient()

  const webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  const path = `${courseId}/${Date.now()}.webp`

  const { error: uploadError } = await supabase.storage
    .from('course-covers')
    .upload(path, webpFile, { upsert: true, contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('course-covers').getPublicUrl(path)

  const { error } = await supabase.from('courses').update({ cover_image_url: publicUrl }).eq('id', courseId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/cursos/${courseId}`)
  revalidatePath('/admin/cursos')
  revalidatePath('/dashboard')
  return { success: true, url: publicUrl }
}

export async function reorderCourse(courseId: string, direction: 'up' | 'down') {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('courses').select('order_index').eq('id', courseId).single()
  if (!current) return { error: 'Curso não encontrado' }

  const { data: neighbor } = await supabase
    .from('courses')
    .select('id, order_index')
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await supabase.from('courses').update({ order_index: neighbor.order_index }).eq('id', courseId)
  await supabase.from('courses').update({ order_index: current.order_index }).eq('id', neighbor.id)

  revalidatePath('/admin/cursos')
  return { success: true }
}
