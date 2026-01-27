// Service Worker AquaNet - Versão Push
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

// 1. Estratégia de Cache (Network First)
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});

// 2. Receber Notificação Push
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'AquaNet', body: 'Nova interação!' };

  const options = {
    body: data.body,
    icon: '/icon-512.png', // Usa seu ícone existente
    badge: '/icon-512.png', // Ícone pequeno da barra de tarefas
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/' // Guarda a URL para abrir ao clicar
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 3. Clicar na Notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then( windowClients => {
      // Se a aba já estiver aberta, foca nela
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
