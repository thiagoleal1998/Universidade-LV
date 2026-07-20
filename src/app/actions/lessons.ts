'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireModuleAccess, requireLessonAccess } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { notifyCourseMembers } from '@/app/actions/notifications'
import { toWebP } from '@/lib/image'

// Mutações usam adminClient após o guard (RLS de lessons é admin-only).
// A posse é herdada: lesson → module → course.owner_area_id.

export async function createLesson(moduleId: string, formData: FormData) {
  const ctx = await requireModuleAccess(moduleId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  const { data: lessons } = await adminClient
    .from('lessons')
    .select('order_index')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (lessons?.[0]?.order_index ?? -1) + 1

  const { data, error } = await adminClient
    .from('lessons')
    .insert({ module_id: moduleId, title, description, order_index: nextIndex })
    .select()
    .single()

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'aula', entityLabel: title, entityId: data?.id })

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { data }
}

export async function updateLesson(id: string, moduleId: string, formData: FormData) {
  const ctx = await requireLessonAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
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
  const { data: prev } = await adminClient
    .from('lessons')
    .select('title, description, youtube_url, content_text, sheet_url, is_published, publish_at, task_start_date, task_end_date, modules(course_id)')
    .eq('id', id)
    .single()

  const after = { title, description, youtube_url, content_text, sheet_url, is_published, publish_at, task_start_date, task_end_date }
  const { error } = await adminClient
    .from('lessons')
    .update(after)
    .eq('id', id)

  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', youtube_url: 'vídeo', content_text: 'conteúdo',
    sheet_url: 'planilha', is_published: 'publicação', publish_at: 'agendamento',
    task_start_date: 'início da tarefa', task_end_date: 'fim da tarefa',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'aula', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

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
  const ctx = await requireLessonAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: prev } = await adminClient
    .from('lessons')
    .select('is_published, title, description, modules(course_id)')
    .eq('id', id)
    .single()

  const { error } = await adminClient
    .from('lessons')
    .update({ is_published })
    .eq('id', id)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'aula', entityId: id, entityLabel: prev?.title ?? id, detail: is_published ? 'publicou' : 'despublicou' })

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
  const ctx = await requireLessonAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: lesson } = await adminClient.from('lessons').select('title').eq('id', id).single()
  const { error } = await adminClient
    .from('lessons')
    .update({ publish_at: new Date(publish_at).toISOString(), is_published: false })
    .eq('id', id)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'update', entityType: 'aula', entityId: id, entityLabel: lesson?.title ?? id, detail: `agendou publicação para ${new Date(publish_at).toLocaleString('pt-BR')}` })

  revalidatePath(`/admin/aulas/${id}`)
  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

// Reorder de aula é escopado ao módulo (o colaborador vê o módulo inteiro da
// área dele), então continua liberado — diferente do reorder global de cursos.
export async function reorderLesson(id: string, moduleId: string, direction: 'up' | 'down') {
  const ctx = await requireModuleAccess(moduleId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: current } = await adminClient
    .from('lessons').select('order_index, title').eq('id', id).single()
  if (!current) return { error: 'Aula não encontrada' }

  const { data: neighbor } = await adminClient
    .from('lessons')
    .select('id, order_index')
    .eq('module_id', moduleId)
    .eq('order_index', direction === 'up' ? current.order_index - 1 : current.order_index + 1)
    .single()
  if (!neighbor) return { error: 'Não é possível mover' }

  await adminClient.from('lessons').update({ order_index: neighbor.order_index }).eq('id', id)
  await adminClient.from('lessons').update({ order_index: current.order_index }).eq('id', neighbor.id)

  logActivity(ctx, { action: 'reorder', entityType: 'aula', entityId: id, entityLabel: current.title ?? id, detail: `moveu para ${direction === 'up' ? 'cima' : 'baixo'}` })

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

export async function publishAllLessons(moduleId: string) {
  const ctx = await requireModuleAccess(moduleId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: lessons } = await adminClient
    .from('lessons')
    .select('id, is_published, title, description, modules(course_id)')
    .eq('module_id', moduleId)
    .eq('is_published', false)

  if (!lessons || lessons.length === 0) return { count: 0 }

  const { error } = await adminClient
    .from('lessons')
    .update({ is_published: true })
    .eq('module_id', moduleId)
    .eq('is_published', false)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'modulo', entityId: moduleId, entityLabel: moduleId, detail: `publicou todas as aulas (${lessons.length})` })

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
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1200, quality: 85 })
  const isSvg = webpFile.type === 'image/svg+xml'
  const ext = isSvg ? file.name.split('.').pop() : 'webp'
  const path = `content-images/${lessonId}/${Date.now()}.${ext}`
  const { error } = await adminClient.storage.from('uploads').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = adminClient.storage.from('uploads').getPublicUrl(path)

  logActivity(ctx, { action: 'upload', entityType: 'aula', entityId: lessonId, entityLabel: lessonId, detail: `imagem no conteúdo: ${file.name}` })

  return { url: publicUrl }
}

export async function deleteLesson(id: string, moduleId: string) {
  const ctx = await requireLessonAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: lesson } = await adminClient.from('lessons').select('title').eq('id', id).single()
  const { error } = await adminClient.from('lessons').delete().eq('id', id)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'aula', entityId: id, entityLabel: lesson?.title ?? id })

  revalidatePath(`/admin/modulos/${moduleId}`)
  return { success: true }
}

export async function uploadLessonPhoto(
  lessonId: string,
  file: File,
  caption: string
) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const webpFile = await toWebP(file, { maxWidth: 1200, quality: 85 })
  const path = `${lessonId}/${Date.now()}.webp`

  const { error: uploadError } = await adminClient.storage
    .from('lesson-photos')
    .upload(path, webpFile, { contentType: 'image/webp' })

  if (uploadError) return { error: uploadError.message }

  const { data: photos } = await adminClient
    .from('lesson_photos')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (photos?.[0]?.order_index ?? -1) + 1

  const { error: dbError } = await adminClient
    .from('lesson_photos')
    .insert({ lesson_id: lessonId, storage_path: path, caption, order_index: nextIndex })

  if (dbError) return { error: dbError.message }

  const { data: lesson } = await adminClient.from('lessons').select('title').eq('id', lessonId).single()
  logActivity(ctx, { action: 'upload', entityType: 'aula', entityId: lessonId, entityLabel: lesson?.title ?? lessonId, detail: `foto: ${caption || file.name}` })

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteLessonPhoto(photoId: string, storagePath: string, lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  await adminClient.storage.from('lesson-photos').remove([storagePath])

  const { error } = await adminClient.from('lesson_photos').delete().eq('id', photoId)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'aula', entityId: lessonId, entityLabel: lessonId, detail: 'excluiu foto' })

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function uploadLessonAttachment(lessonId: string, file: File) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const path = `${lessonId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await adminClient.storage
    .from('lesson-attachments')
    .upload(path, file)

  if (uploadError) return { error: uploadError.message }

  const { data: existing } = await adminClient
    .from('lesson_attachments')
    .select('order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { error: dbError } = await adminClient.from('lesson_attachments').insert({
    lesson_id: lessonId,
    name: file.name,
    storage_path: path,
    size_bytes: file.size,
    mime_type: file.type || 'application/octet-stream',
    order_index: nextIndex,
  })

  if (dbError) return { error: dbError.message }

  const { data: lesson } = await adminClient.from('lessons').select('title').eq('id', lessonId).single()
  logActivity(ctx, { action: 'upload', entityType: 'aula', entityId: lessonId, entityLabel: lesson?.title ?? lessonId, detail: `anexo: ${file.name}` })

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}

export async function deleteLessonAttachment(attachmentId: string, storagePath: string, lessonId: string) {
  const ctx = await requireLessonAccess(lessonId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  await adminClient.storage.from('lesson-attachments').remove([storagePath])

  const { error } = await adminClient.from('lesson_attachments').delete().eq('id', attachmentId)

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'aula', entityId: lessonId, entityLabel: lessonId, detail: 'excluiu anexo' })

  revalidatePath(`/admin/aulas/${lessonId}`)
  revalidatePath(`/dashboard/aulas/${lessonId}`)
  return { success: true }
}
