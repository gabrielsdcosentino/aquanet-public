// Service Worker Minimalista para PWA - Versão 4
self.addEventListener('install', (e) => {
  console.log('[AquaNet App] Instalado v4');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[AquaNet App] Ativado v4');
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Estratégia Network First: Sempre tenta pegar conteúdo novo.
  e.respondWith(fetch(e.request));
});