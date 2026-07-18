import { getSettings } from '@/lib/settings'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const settings = await getSettings()
  const { reason } = await searchParams

  const messages = settings.login_messages
    .split('\n')
    .map((m) => m.trim())
    .filter(Boolean)

  return <LoginForm settings={settings} messages={messages} reason={reason} />
}
