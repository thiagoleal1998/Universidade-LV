import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
// web-push exige que o subject seja "https:" ou "mailto:" — NEXT_PUBLIC_SITE_URL
// é "http://localhost:3000" em dev, o que quebrava setVapidDetails() (e, por
// import em cadeia, TODA Server Action que passa por notifications.ts) já na
// carga do módulo, com "This page couldn't load" na primeira ação disparada.
const subject = `mailto:${process.env.ADMIN_EMAIL ?? 'contato@universidadelv.com.br'}`

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

type PushPayload = { title: string; body: string; url: string }

// Notificação nativa do navegador/SO (Web Push) — complementa a notificação
// do sino, não a substitui. No-op silencioso sem as chaves VAPID configuradas
// (mesmo padrão de RD Station/Notion: recurso opcional, projeto continua
// funcionando sem ele). Chamado a partir de notifications.ts, no mesmo lugar
// que já insere em `notifications` — sempre fire-and-forget, nunca bloqueia
// a ação que disparou a notificação original.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!publicKey || !privateKey || userIds.length === 0) return

  try {
    const adminClient = createAdminClient()
    const { data: subs } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    if (!subs?.length) return

    const body = JSON.stringify(payload)
    const deadIds: string[] = []

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
      } catch (err) {
        // 404/410 = inscrição expirada ou revogada pelo navegador (ex.: o
        // usuário desinstalou/limpou dados) — limpa pra não tentar de novo
        // pra sempre. Qualquer outro erro (rede, etc.) só loga.
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) deadIds.push(sub.id)
        else console.error('[webpush] falhou ao enviar:', err)
      }
    }))

    if (deadIds.length > 0) {
      await adminClient.from('push_subscriptions').delete().in('id', deadIds)
    }
  } catch (err) {
    console.error('[webpush] falhou ao processar envio:', err)
  }
}
