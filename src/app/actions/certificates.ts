'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireModuleAccess } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'
import { toOne } from '@/lib/supabase/relations'
import { revalidatePath } from 'next/cache'

// Emitir/aprovar/revogar certificado exige posse do curso do módulo (mesma
// regra de requireModuleAccess já usada em courses/modules/lessons — reusa a
// capacidade 'courses', já que quem tem curso próprio já tem essa capacidade).
// As configurações GLOBAIS do certificado (template/assinatura/posição do
// nome), mais abaixo neste arquivo, continuam requireAdmin() — não são por curso.
export async function issueCertificate(
  userId: string,
  moduleId: string,
  template: string,
  status: 'internal' | 'approved' = 'internal',
) {
  const ctx = await requireModuleAccess(moduleId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: mod }] = await Promise.all([
    adminClient.from('profiles').select('full_name').eq('id', userId).single(),
    adminClient.from('modules').select('title').eq('id', moduleId).single(),
  ])

  const { error } = await adminClient
    .from('certificates')
    .upsert(
      { user_id: userId, module_id: moduleId, authorized_by: ctx.userId, template, status },
      { onConflict: 'user_id,module_id' },
    )

  if (error) return { error: error.message }

  logActivity(ctx, {
    action: 'create',
    entityType: 'certificado',
    entityLabel: `${profile?.full_name ?? 'Membro'} — ${mod?.title ?? 'Módulo'}`,
    detail: status === 'approved' ? 'emitiu (aprovado)' : 'emitiu (interno)',
  })

  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function approveCertificate(certificateId: string) {
  const adminClientPre = createAdminClient()
  const { data: certPre } = await adminClientPre.from('certificates').select('module_id').eq('id', certificateId).single()
  if (!certPre) return { error: 'Certificado não encontrado.' }

  const ctx = await requireModuleAccess(certPre.module_id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: cert } = await adminClient
    .from('certificates')
    .select('profiles(full_name), modules(title)')
    .eq('id', certificateId)
    .single()

  const { error } = await adminClient
    .from('certificates')
    .update({ status: 'approved' })
    .eq('id', certificateId)
  if (error) return { error: error.message }

  const profile = toOne<{ full_name: string }>(cert?.profiles)
  const mod = toOne<{ title: string }>(cert?.modules)
  logActivity(ctx, {
    action: 'toggle',
    entityType: 'certificado',
    entityId: certificateId,
    entityLabel: `${profile?.full_name ?? 'Membro'} — ${mod?.title ?? 'Módulo'}`,
    detail: 'aprovou',
  })

  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function revokeCertificate(certificateId: string) {
  const adminClientPre = createAdminClient()
  const { data: certPre } = await adminClientPre.from('certificates').select('module_id').eq('id', certificateId).single()
  if (!certPre) return { error: 'Certificado não encontrado.' }

  const ctx = await requireModuleAccess(certPre.module_id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: cert } = await adminClient
    .from('certificates')
    .select('profiles(full_name), modules(title)')
    .eq('id', certificateId)
    .single()

  const { error } = await adminClient.from('certificates').delete().eq('id', certificateId)
  if (error) return { error: error.message }

  const profile = toOne<{ full_name: string }>(cert?.profiles)
  const mod = toOne<{ title: string }>(cert?.modules)
  logActivity(ctx, {
    action: 'delete',
    entityType: 'certificado',
    entityId: certificateId,
    entityLabel: `${profile?.full_name ?? 'Membro'} — ${mod?.title ?? 'Módulo'}`,
  })

  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}

export async function updateCertificateSettings(formData: FormData) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const adminClient = createAdminClient()
    const entries = [
      { key: 'certificate_template', value: (formData.get('certificate_template') as string) || 'classic' },
      { key: 'certificate_signatory_name', value: (formData.get('certificate_signatory_name') as string) || '' },
      { key: 'certificate_signatory_role', value: (formData.get('certificate_signatory_role') as string) || '' },
    ]
    for (const entry of entries) {
      await adminClient.from('site_settings').upsert(entry, { onConflict: 'key' })
    }

    logActivity(ctx, {
      action: 'update',
      entityType: 'configuracao_certificado',
      entityLabel: 'Configurações de certificado',
      detail: `modelo: ${entries[0].value}`,
    })

    revalidatePath('/admin/documentos')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar' }
  }
}

export async function uploadCertificateTemplate(formData: FormData) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const file = formData.get('file') as File
  if (!file || !file.size) return { error: 'Nenhum arquivo selecionado' }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `certificate-templates/template-${Date.now()}.${ext}`

  const { error: uploadError } = await adminClient.storage
    .from('uploads')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage.from('uploads').getPublicUrl(path)

  await adminClient
    .from('site_settings')
    .upsert({ key: 'certificate_custom_url', value: publicUrl }, { onConflict: 'key' })

  logActivity(ctx, {
    action: 'upload',
    entityType: 'configuracao_certificado',
    entityLabel: 'Configurações de certificado',
    detail: `modelo customizado: ${file.name}`,
  })

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
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const entries = [
    { key: 'certificate_name_x', value: data.x },
    { key: 'certificate_name_y', value: data.y },
    { key: 'certificate_name_font', value: data.font },
    { key: 'certificate_name_size', value: data.size },
    { key: 'certificate_name_color', value: data.color },
  ]
  for (const entry of entries) {
    await adminClient.from('site_settings').upsert(entry, { onConflict: 'key' })
  }

  logActivity(ctx, {
    action: 'update',
    entityType: 'configuracao_certificado',
    entityLabel: 'Configurações de certificado',
    detail: 'posição do nome no certificado',
  })

  revalidatePath('/admin/documentos')
  revalidatePath('/dashboard/documentos')
  return { success: true }
}
