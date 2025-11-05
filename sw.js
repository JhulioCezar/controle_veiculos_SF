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

// INÍCIO EVENTO: INSTALAÇÃO
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('✅ Cache estático pré-carregado');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('🚀 SkipWaiting ativado');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Erro no cache de instalação:', error);
      })
  );
});
// FIM EVENTO INSTALAÇÃO

// INÍCIO EVENTO: ATIVAÇÃO
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker ativando...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Remove caches antigos
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('🧹 Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('✅ Nova versão ativada');
      return self.clients.claim();
    })
  );
});
// FIM EVENTO ATIVAÇÃO

// INÍCIO EVENTO: FETCH (Intercepta requisições)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignora requisições não-GET e para o Google Apps Script
  if (request.method !== 'GET' || request.url.includes('script.google.com')) {
    return;
  }

  // 🔥 CORREÇÃO: URLs do GitHub Pages
  if (request.url.includes('github.io') || request.url.startsWith('http')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // INÍCIO ESTRATÉGIA: Network First com fallback para cache
        return fetch(request)
          .then((networkResponse) => {
            // Cache apenas respostas válidas
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback para cache
            return cachedResponse || caches.match('./index.html');
          });
        // FIM ESTRATÉGIA Network First
      })
    );
  }
});
// FIM EVENTO FETCH

// INÍCIO EVENTO: MESSAGE (Comunicação com a app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Pulando para nova versão');
    self.skipWaiting();
  }
});
// FIM EVENTO MESSAGE
