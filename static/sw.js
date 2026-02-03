const CACHE_NAME = 'aquanet-safe-v1';

// Instalação imediata
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Ativação imediata
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Fetch "Network Only" (Seguro)
// Não interceptamos nada para guardar em cache, evitando o bug da tela branca/velha.
self.addEventListener('fetch', (event) => {
    // Deixa o navegador fazer o pedido normal para a internet
    return;
});
