import { getSettings } from '@/lib/settings'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const settings = await getSettings()

  const messages = settings.login_messages
    .split('\n')
    .map((m) => m.trim())
    .filter(Boolean)

  return <LoginForm settings={settings} messages={messages} />
}
