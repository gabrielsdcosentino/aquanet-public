// Service Worker Minimalista para PWA
self.addEventListener('install', (e) => {
  console.log('[AquaNet App] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[AquaNet App] Ativado');
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Estratégia Network First: Sempre tenta pegar conteúdo novo.
  // Se falhar (offline), poderia mostrar uma página de erro (futuro).
  e.respondWith(fetch(e.request));
});
