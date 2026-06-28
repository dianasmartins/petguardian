self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {}
    const options = {
        body: data.body || 'Novo avistamento reportado!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/ocorrencias' },
    }
    event.waitUntil(
        self.registration.showNotification(data.title || '🐾 PetGuardian', options)
    )
})

self.addEventListener('notificationclick', function (event) {
    event.notification.close()
    event.waitUntil(clients.openWindow(event.notification.data.url || '/ocorrencias'))
})