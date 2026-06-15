'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function issueCertificate(
  userId: string,
  moduleId: string,
  template: string,
  status: 'internal' | 'approved' = 'internal',
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('certificates')
    .upsert(
      { user_id: userId, module_id: moduleId, authorized_by: user.id, template, status },
      { onConflict: 'user_id,module_id' },
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function approveCertificate(certificateId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('certificates')
    .update({ status: 'approved' })
    .eq('id', certificateId)
  if (error) return { error: error.message }
  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function revokeCertificate(certificateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('certificates').delete().eq('id', certificateId)
  if (error) return { error: error.message }
  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function updateCertificateSettings(formData: FormData) {
  try {
    const supabase = await createClient()
    const entries = [
      { key: 'certificate_template', value: (formData.get('certificate_template') as string) || 'classic' },
      { key: 'certificate_signatory_name', value: (formData.get('certificate_signatory_name') as string) || '' },
      { key: 'certificate_signatory_role', value: (formData.get('certificate_signatory_role') as string) || '' },
    ]
    for (const entry of entries) {
      await supabase.from('site_settings').upsert(entry, { onConflict: 'key' })
    }
    revalidatePath('/admin/documentos')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar' }
  }
}

export async function uploadCertificateTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const file = formData.get('file') as File
  if (!file || !file.size) return { error: 'Nenhum arquivo selecionado' }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `certificate-templates/template-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)

  await supabase
    .from('site_settings')
    .upsert({ key: 'certificate_custom_url', value: publicUrl }, { onConflict: 'key' })

  revalidatePath('/admin/documentos')
  return { success: true, url: publicUrl }
}

export async function saveCertificateNamePosition(data: {
  x: string
  y: string
  font: string
  size: string
  color: string
}) {
  const supabase = await createClient()
  const entries = [
    { key: 'certificate_name_x', value: data.x },
    { key: 'certificate_name_y', value: data.y },
    { key: 'certificate_name_font', value: data.font },
    { key: 'certificate_name_size', value: data.size },
    { key: 'certificate_name_color', value: data.color },
  ]
  for (const entry of entries) {
    await supabase.from('site_settings').upsert(entry, { onConflict: 'key' })
  }
  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}
