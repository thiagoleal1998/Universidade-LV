'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailMembersNewAnnouncement } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import { notifyAllMembers } from '@/app/actions/notifications'

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const publish_at_raw = (formData.get('publish_at') as string) || null
  const publish_at = publish_at_raw ? new Date(publish_at_raw).toISOString() : null

  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, body, publish_at })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { data }
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const supabase = await createClient()
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const is_published = formData.get('is_published') === 'true'
  const publish_at_raw = (formData.get('publish_at') as string) || null
  const publish_at = publish_at_raw ? new Date(publish_at_raw).toISOString() : null

  const { error } = await supabase
    .from('announcements')
    .update({ title, body, is_published, publish_at, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleAnnouncementPublished(id: string, is_published: boolean) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: ann, error } = await supabase
    .from('announcements')
    .update({ is_published, publish_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('title, body')
    .single()

  if (error) return { error: error.message }

  if (is_published && ann) {
    const [{ data: profiles }, { data: usersData }, settings] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'member').eq('active', true),
      adminClient.auth.admin.listUsers(),
      getSettings(),
    ])
    const activeIds = new Set((profiles ?? []).map((p) => p.id))
    const emails = (usersData?.users ?? [])
      .filter((u) => activeIds.has(u.id) && u.email)
      .map((u) => u.email!)
    emailMembersNewAnnouncement(emails, ann.title, ann.body, settings.site_name)

    // Internal notifications
    notifyAllMembers({
      type: 'announcement',
      title: `Novo comunicado: ${ann.title}`,
      body: ann.body?.substring(0, 120) ?? '',
      link: '/dashboard',
    })
  }

  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function scheduleAnnouncement(id: string, publish_at: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('announcements')
    .update({
      publish_at: new Date(publish_at).toISOString(),
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}
