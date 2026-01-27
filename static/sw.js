// Service Worker Minimalista para PWA - Versão 2
self.addEventListener('install', (e) => {
  console.log('[AquaNet App] Instalado v2');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[AquaNet App] Ativado v2');
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Estratégia Network First: Sempre tenta pegar conteúdo novo.
  e.respondWith(fetch(e.request));
});