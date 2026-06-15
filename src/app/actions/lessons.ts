'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyCourseMembers } from '@/app/actions/notifications'

export async function createLesson(moduleId: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { data: lessons } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (lessons?.[0]?.order_index ?? -1) + 1

  const { data, error } = await supabase
    .from('lessons')
    .insert({ module_id: moduleId, title, description, order_index: nextIndex })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { data }
}

export async function updateLesson(id: string, moduleId: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const youtube_url = (formData.get('youtube_url') as string) || null
  const content_text = (formData.get('content_text') as string) || null
  const sheet_url = (formData.get('sheet_url') as string) || null
  const is_published = formData.get('is_published') === 'true'
  const publish_at_raw = (formData.get('publish_at') as string) || null
  const publish_at = publish_at_raw ? new Date(publish_at_raw).toISOString() : null
  const task_start_date = (formData.get('task_start_date') as string) || null
  const task_end_date = (formData.get('task_end_date') as string) || null

  // Get previous state to detect first-publish event
  const { data: prev } = await supabase
    .from('lessons')
    .select('is_published, modules(course_id)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('lessons')
    .update({ title, description, youtube_url, content_text, sheet_url, is_published, publish_at, task_start_date, task_end_date })
    .eq('id', id)

  if (error) return { error: error.message }

  // Notify course members when publishing for the first time
  if (is_published && !prev?.is_published) {
    const courseId = (prev?.modules as { course_id?: string } | null)?.course_id
    if (courseId) {
      notifyCourseMembers(courseId, {
        type: 'lesson_published',
        title: `Nova aula disponível: ${title}`,
        body: description ?? '',
        link: `/dashboard/aulas/${id}`,
      })
    }
  }

  revalidatePath(`/admin/aulas/${id}`)
  revalidatePath(`/admin/modulos/${moduleId}`)
  revalidatePath(`/dashboard/aulas/${id}`)
  return { success: true }
}

export async function setLessonPublished(id: string, moduleId: string, is_published: boolean) {
  const supabase = await createClient()

  const { data: prev } = await supabase
    .from('lessons')
    .select('is_published, title, description, modules(course_id)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('lessons')
    .update({ is_published })
    .eq('id', id)

  if (error) return { error: error.message }

  if (is_published && !prev?.is_published) {
    const courseId = (prev?.modules as { course_id?: string } | null)?.course_id
    if (courseId) {
      notifyCourseMembers(courseId, {
        type: 'lesson_published',
        title: `Nova aula disponível: ${prev?.title ?? ''}`,
        body: prev?.description ?? '',
        link: `/dashboard/aulas/${id}`,
      })
    }
  }

  revalidatePath(`/admin/aulas/${id}`)
  revalidatePath(`/admin/modulos/${moduleId}`)
  revalidatePath(`/dashboard/aulas/${id}`)
  return { success: true }
}

export async function scheduleLesson(id: string, moduleId: string, publish_at: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .update({ publish_at: new Date(publish_at).toISOString(), is_published: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/aulas/${id}`)
  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

export async function reorderLesson(id: string, moduleId: string, direction: 'up' | 'down') {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('lessons').select('order_index').eq('id', id).single()
  if (!current) return { error: 'Aula não encontrada' }

  const { data: neighbor } = await supabase
    .from('lessons')
    .select('id, order_index')
    .eq('module_id', moduleId)
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await supabase.from('lessons').update({ order_index: neighbor.order_index }).eq('id', id)
  await supabase.from('lessons').update({ order_index: current.order_index }).eq('id', neighbor.id)

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

export async function publishAllLessons(moduleId: string) {
  const supabase = await createClient()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, is_published, title, description, modules(course_id)')
    .eq('module_id', moduleId)
    .eq('is_published', false)

  if (!lessons || lessons.length === 0) return { count: 0 }

  const { error } = await supabase
    .from('lessons')
    .update({ is_published: true })
    .eq('module_id', moduleId)
    .eq('is_published', false)

  if (error) return { error: error.message }

  const courseId = (lessons[0]?.modules as { course_id?: string } | null)?.course_id
  if (courseId) {
    for (const lesson of lessons) {
      notifyCourseMembers(courseId, {
        type: 'lesson_published',
        title: `Nova aula disponível: ${lesson.title}`,
        body: lesson.description ?? '',
        link: `/dashboard/aulas/${lesson.id}`,
      })
    }
  }

  revalidatePath(`/admin/modulos/${moduleId}`)
  lessons.forEach((l) => revalidatePath(`/dashboard/aulas/${l.id}`))
  return { count: lessons.length }
}

export async function uploadContentImage(lessonId: string, file: File) {
  const supabase = await createClient()
  const ext = file.name.split('.').pop()
  const path = `content-images/${lessonId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(path, file)
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
  return { url: publicUrl }
}

export async function deleteLesson(id: string, moduleId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('lessons').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

export async function uploadLessonPhoto(
  lessonId: string,
  file: File,
  caption: string
) {
  const supabase = await createClient()

  const ext = file.name.split('.').pop()
  const path = `${lessonId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('lesson-photos')
    .upload(path, file)

  if (uploadError) return { error: uploadError.message }

  const { data: photos } = await supabase
    .from('lesson_photos')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (photos?.[0]?.order_index ?? -1) + 1

  const { error: dbError } = await supabase
    .from('lesson_photos')
    .insert({ lesson_id: lessonId, storage_path: path, caption, order_index: nextIndex })

  if (dbError) return { error: dbError.message }

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteLessonPhoto(photoId: string, storagePath: string, lessonId: string) {
  const supabase = await createClient()

  await supabase.storage.from('lesson-photos').remove([storagePath])

  const { error } = await supabase.from('lesson_photos').delete().eq('id', photoId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function uploadLessonAttachment(lessonId: string, file: File) {
  const supabase = await createClient()

  const ext = file.name.split('.').pop()
  const path = `${lessonId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await supabase.storage
    .from('lesson-attachments')
    .upload(path, file)

  if (uploadError) return { error: uploadError.message }

  const { data: existing } = await supabase
    .from('lesson_attachments')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { error: dbError } = await supabase.from('lesson_attachments').insert({
    lesson_id: lessonId,
    name: file.name,
    storage_path: path,
    size_bytes: file.size,
    mime_type: file.type || 'application/octet-stream',
    order_index: nextIndex,
  })

  if (dbError) return { error: dbError.message }

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteLessonAttachment(attachmentId: string, storagePath: string, lessonId: string) {
  const supabase = await createClient()

  await supabase.storage.from('lesson-attachments').remove([storagePath])

  const { error } = await supabase.from('lesson_attachments').delete().eq('id', attachmentId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}
