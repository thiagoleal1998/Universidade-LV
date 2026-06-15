import { getSettings } from '@/lib/settings'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default async function ForgotPasswordPage() {
  const settings = await getSettings()
  const messages = settings.login_messages.split('\n').map((m) => m.trim()).filter(Boolean)
  return <ForgotPasswordForm settings={settings} messages={messages} />
}
