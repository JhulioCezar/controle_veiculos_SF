// INÍCIO CONFIGURAÇÃO DO CACHE
const CACHE_NAME = 'checklist-veiculos-v3.0.0';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';

// ARQUIVOS PARA CACHE NA INSTALAÇÃO
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './android-icon-192x192.png',
  './android-icon-512x512.png',
  'https://i.imgur.com/SEr4lkm.png', // 🔥 LOGO ADICIONADA
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js'
];
// FIM CONFIGURAÇÃO DO CACHE
// 📦 Instalação
self.addEventListener("install", event => {
  console.log("📦 Instalando Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .catch(err => console.log("❌ Erro no cache:", err))
  );
  self.skipWaiting();
});

// 🔄 Ativação
self.addEventListener("activate", event => {
  console.log("🔄 Ativando nova versão...");
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 🌐 Intercepta requisições
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          // Só cachear se for uma resposta válida e do mesmo origin
          if (response && response.status === 200 && response.url.startsWith(self.location.origin)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cached || caches.match("./index.html")); // ✅ Fallback correto

      // Para páginas HTML, priorizar network
      if (event.request.destination === "document" || 
          event.request.headers.get('accept').includes('text/html')) {
        return fetchPromise;
      }

      return cached || fetchPromise;
    })
  );
});

// 🔔 Atualização manual
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
