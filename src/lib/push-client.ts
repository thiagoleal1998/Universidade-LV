'use client'

import { subscribeToPush, unsubscribeFromPush } from '@/app/actions/push-subscriptions'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// Não confunde com "tem permissão concedida" — o browser pode ter a
// permissão mas a inscrição (endpoint+chaves) já ter sido revogada/expirada,
// por isso sempre confere a subscription de verdade via Service Worker.
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export async function enablePushNotifications(): Promise<{ error?: string }> {
  if (!isPushSupported()) return { error: 'Este navegador não suporta notificações.' }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return { error: 'Notificações não configuradas no servidor.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { error: 'Permissão de notificação negada.' }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
    }
    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { error: 'Falha ao gerar a inscrição de notificação.' }
    }
    const r = await subscribeToPush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })
    return r?.error ? { error: r.error } : {}
  } catch {
    return { error: 'Falha ao ativar notificações.' }
  }
}

export async function disablePushNotifications(): Promise<void> {
  const sub = await getExistingSubscription()
  if (!sub) return
  await unsubscribeFromPush(sub.endpoint)
  await sub.unsubscribe().catch(() => {})
}
