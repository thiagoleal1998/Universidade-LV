import { getSettings } from '@/lib/settings'
import { RegisterForm } from '@/components/auth/register-form'

export default async function RegisterPage() {
  const settings = await getSettings()
  const messages = settings.login_messages.split('\n').map((m) => m.trim()).filter(Boolean)
  return <RegisterForm settings={settings} messages={messages} />
}
