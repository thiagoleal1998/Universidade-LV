// Service worker mínimo, só para notificação push nativa do navegador/SO.
// Não faz cache de assets nem funciona offline de propósito — o objetivo
// aqui é só receber `push` e mostrar a notificação, nada mais.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Universidade LV', body: event.data.text() }
  }

  const title = payload.title || 'Universidade LV'
  const options = {
    body: payload.body || '',
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
