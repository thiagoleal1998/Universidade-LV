import { getSettings } from '@/lib/settings'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default async function ResetPasswordPage() {
  const settings = await getSettings()
  const messages = settings.login_messages.split('\n').map((m) => m.trim()).filter(Boolean)
  return <ResetPasswordForm settings={settings} messages={messages} />
}
