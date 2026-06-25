import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { buttonVariants } from '@/components/ui/button'
import { CertificateRenderer } from '@/components/certificate-renderer'
import { Printer, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Certificados' }

export default async function CertificadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profileData }, { data: certsData }, settings] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase
      .from('certificates')
      .select('id, template, issued_at, modules!certificates_module_id_fkey(title)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('issued_at', { ascending: false }),
    getSettings(),
  ])

  const memberName = (profileData as { full_name: string } | null)?.full_name || ''
  const certs = (certsData ?? []) as unknown as {
    id: string
    template: string
    issued_at: string
    modules: { title: string } | null
  }[]

  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Award className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-foreground">Nenhum certificado emitido ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Conclua um módulo e aguarde a autorização do administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {certs.map((cert) => {
        const mod = Array.isArray(cert.modules) ? cert.modules[0] : cert.modules
        const data = {
          memberName,
          moduleName: mod?.title ?? '',
          siteName: settings.site_name,
          logoUrl: settings.logo_url,
          issuedAt: cert.issued_at,
          signatoryName: settings.certificate_signatory_name,
          signatoryRole: settings.certificate_signatory_role,
          template: cert.template,
          customTemplateUrl: settings.certificate_custom_url,
          nameX: settings.certificate_name_x,
          nameY: settings.certificate_name_y,
          nameFont: settings.certificate_name_font,
          nameSize: settings.certificate_name_size,
          nameColor: settings.certificate_name_color,
        }
        return (
          <div key={cert.id} className="bg-card border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{mod?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Emitido em {new Date(cert.issued_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Link
                href={`/certificado/${cert.id}`}
                target="_blank"
                className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-2')}
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Link>
            </div>
            <div className="p-4 bg-muted/20">
              <CertificateRenderer data={data} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
