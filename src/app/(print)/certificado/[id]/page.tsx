'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CertificateRendererPrint } from '@/components/certificate-renderer'
import type { CertificateData } from '@/components/certificate-renderer'

const SETTINGS_KEYS = [
  'site_name',
  'logo_url',
  'certificate_signatory_name',
  'certificate_signatory_role',
  'certificate_custom_url',
  'certificate_name_x',
  'certificate_name_y',
  'certificate_name_font',
  'certificate_name_size',
  'certificate_name_color',
]

export default function PrintCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<CertificateData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      const { id } = await params
      const supabase = createClient()

      const { data: cert } = await supabase
        .from('certificates')
        .select(`
          id, template, issued_at,
          profiles!certificates_user_id_fkey(full_name),
          modules!certificates_module_id_fkey(title),
          authorized_by
        `)
        .eq('id', id)
        .single()

      if (!cert) { setError(true); return }

      const { data: settingsRows } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', SETTINGS_KEYS)

      const s: Record<string, string> = {}
      for (const row of settingsRows ?? []) s[row.key] = row.value

      const profile = Array.isArray(cert.profiles) ? cert.profiles[0] : cert.profiles
      const mod = Array.isArray(cert.modules) ? cert.modules[0] : cert.modules

      setData({
        memberName: (profile as { full_name: string } | null)?.full_name ?? '',
        moduleName: (mod as { title: string } | null)?.title ?? '',
        siteName: s.site_name ?? 'Universidade LV',
        logoUrl: s.logo_url ?? '',
        issuedAt: cert.issued_at,
        signatoryName: s.certificate_signatory_name ?? '',
        signatoryRole: s.certificate_signatory_role ?? '',
        template: cert.template ?? 'classic',
        customTemplateUrl: s.certificate_custom_url ?? '',
        nameX: s.certificate_name_x ?? '50',
        nameY: s.certificate_name_y ?? '50',
        nameFont: s.certificate_name_font ?? 'Dancing Script',
        nameSize: s.certificate_name_size ?? '60',
        nameColor: s.certificate_name_color ?? '#1a1a1a',
      })
    }
    load()
  }, [params])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 500)
      return () => clearTimeout(t)
    }
  }, [data])

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">
      Certificado não encontrado.
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">
      Carregando certificado...
    </div>
  )

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print { html, body { margin: 0; } }
      `}</style>
      <CertificateRendererPrint data={data} />
    </>
  )
}
