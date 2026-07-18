import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { CertificatesAdmin } from '@/components/admin/certificates-admin'
import { FileText } from 'lucide-react'
import { requireAdminPage } from '@/lib/authz'

export default async function DocumentosPage() {
  await requireAdminPage()

  const supabase = await createClient()
  const adminClient = createAdminClient()
  const settings = await getSettings()

  const [
    { data: modulesData },
    { data: lessonsData },
    { data: progressData },
    { data: certificatesData },
    { data: profilesData },
    { data: usersData },
  ] = await Promise.all([
    supabase.from('modules').select('id, title').eq('is_published', true).order('order_index'),
    supabase.from('lessons').select('id, module_id').eq('is_published', true),
    supabase.from('member_progress').select('user_id, lesson_id'),
    supabase.from('certificates').select('id, user_id, module_id, template, issued_at, status'),
    supabase.from('profiles').select('id, full_name').eq('role', 'member').eq('active', true),
    adminClient.auth.admin.listUsers(),
  ])

  const modules = modulesData ?? []
  const lessons = lessonsData ?? []
  const progress = progressData ?? []
  const certificates = (certificatesData ?? []) as {
    id: string; user_id: string; module_id: string; template: string; issued_at: string; status: string
  }[]
  const profiles = profilesData ?? []
  const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? '']))

  const certMap = new Map(certificates.map((c) => [`${c.user_id}:${c.module_id}`, c]))

  const moduleEntries = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.module_id === mod.id)
    if (modLessons.length === 0) return null

    const completedByUser = new Map<string, Set<string>>()
    for (const p of progress) {
      if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set())
      completedByUser.get(p.user_id)!.add(p.lesson_id)
    }

    const completions = profiles
      .filter((profile) => {
        const done = completedByUser.get(profile.id)
        if (!done) return false
        return modLessons.every((l) => done.has(l.id))
      })
      .map((profile) => {
        const cert = certMap.get(`${profile.id}:${mod.id}`)
        return {
          userId: profile.id,
          userName: profile.full_name || emailMap.get(profile.id) || 'Sem nome',
          certificateId: cert?.id ?? null,
          certificateStatus: cert?.status ?? null,
          issuedAt: cert?.issued_at ?? null,
        }
      })

    return { id: mod.id, title: mod.title, completions }
  }).filter(Boolean) as {
    id: string
    title: string
    completions: {
      userId: string
      userName: string
      certificateId: string | null
      certificateStatus: string | null
      issuedAt: string | null
    }[]
  }[]

  const modulesWithCompletions = moduleEntries.filter((m) => m.completions.length > 0)

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documentos</h2>
          <p className="text-sm text-muted-foreground">Gerencie os certificados emitidos para os membros.</p>
        </div>
      </div>

      <CertificatesAdmin
        modules={modulesWithCompletions}
        currentTemplate={settings.certificate_template}
        signatoryName={settings.certificate_signatory_name}
        signatoryRole={settings.certificate_signatory_role}
        customUrl={settings.certificate_custom_url}
        nameX={settings.certificate_name_x}
        nameY={settings.certificate_name_y}
        nameFont={settings.certificate_name_font}
        nameSize={settings.certificate_name_size}
        nameColor={settings.certificate_name_color}
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
      />
    </div>
  )
}
