import { getSettings } from '@/lib/settings'
import { SettingsForm } from '@/components/admin/settings-form'
import { requireAdminPage } from '@/lib/authz'
import { getEmailTemplates } from '@/app/actions/email-templates'

export default async function ConfiguracoesPage() {
  await requireAdminPage()

  const [settings, emailTemplates] = await Promise.all([
    getSettings(),
    getEmailTemplates(),
  ])

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize a aparência e identidade do site.
        </p>
      </div>

      <SettingsForm settings={settings} emailTemplates={emailTemplates} />
    </div>
  )
}
