// Custom service worker additions — push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body:    data.body || '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/' },
    actions: [
      { action: 'open',    title: data.type === 'news' ? 'Ver noticia' : 'Ver partido' },
      { action: 'dismiss', title: 'Cerrar' }
    ],
    tag:      data.tag || data.type || 'general',
    renotify: true
  }
  event.waitUntil(self.registration.showNotification(data.title || 'JugarLaPelota', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/'
  const fullUrl = url.startsWith('http') ? url : self.location.origin + url
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl)
    })
  )
})
