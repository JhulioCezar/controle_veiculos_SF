// INÍCIO CONFIGURAÇÃO DO CACHE
const CACHE_NAME = 'checklist-veiculos-v3.1.0';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';

// 🔥 ARQUIVOS PARA CACHE NA INSTALAÇÃO (SOMENTE RECURSOS LOCAIS E CDNs CONFIÁVEIS)
const FILES_TO_CACHE = [
  './',
  './index.html',
  './colaboradores.html', // 🔥 NOVA PÁGINA ADICIONADA
  './manifest.json',
  './supabase-config.js',
  './android-icon-192x192.png',
  './android-icon-512x512.png'
];

// 🔥 CDNs CONFIÁVEIS PARA CACHE
const CDN_URLS = [
  'https://i.imgur.com/SEr4lkm.png', // Logo
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/@supabase/supabase-js@2' // Supabase JS
];

// 📦 Instalação
self.addEventListener("install", event => {
  console.log("📦 Instalando Service Worker v3.1.0...");
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // 🔥 CACHEAR ARQUIVOS LOCAIS
        console.log("📂 Cacheando arquivos locais...");
        const cacheLocal = cache.addAll(FILES_TO_CACHE);
        
        // 🔥 CACHEAR CDNs SEPARADAMENTE (com tratamento de erro)
        console.log("🌐 Cacheando CDNs...");
        const cacheCDNs = Promise.all(
          CDN_URLS.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`⚠️ Não foi possível cachear: ${url}`);
                return Promise.resolve();
              })
              .catch(err => {
                console.warn(`⚠️ Erro ao cachear ${url}:`, err.message);
                return Promise.resolve();
              })
          )
        );
        
        return Promise.all([cacheLocal, cacheCDNs]);
      })
      .then(() => {
        console.log("✅ Cache instalado com sucesso!");
        return self.skipWaiting();
      })
      .catch(err => console.error("❌ Erro crítico no cache:", err))
  );
});

// 🔄 Ativação
self.addEventListener("activate", event => {
  console.log("🔄 Ativando nova versão do Service Worker...");
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          // 🔥 REMOVER CACHES ANTIGOS
          if (key !== CACHE_NAME && key.includes('checklist-veiculos-')) {
            console.log(`🗑️ Removendo cache antigo: ${key}`);
            return caches.delete(key);
          }
        })
      );
    })
    .then(() => {
      console.log("✅ Cache antigo removido");
      return self.clients.claim();
    })
  );
});

// 🌐 Intercepta requisições
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 🔥 IGNORAR REQUISIÇÕES PARA APIS EXTERNAS
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      request.method !== 'GET') {
    // 🔥 NÃO CACHEAR APIS - SEMPRE BUSCAR DA REDE
    console.log(`🌐 Ignorando cache para API: ${url.hostname}`);
    event.respondWith(fetch(request));
    return;
  }
  
  // 🔥 PARA ARQUIVOS HTML, BUSCAR SEMPRE DA REDE PRIMEIRO
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 🔥 ATUALIZAR CACHE COM NOVA VERSÃO
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // 🔥 FALLBACK PARA INDEX.HTML SE OFFLINE
          return caches.match('./index.html');
        })
    );
    return;
  }
  
  // 🔥 PARA OUTROS RECURSOS (CSS, JS, IMAGENS)
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // 🔥 RETORNAR DO CACHE SE DISPONÍVEL
        if (cachedResponse) {
          console.log(`📂 Servindo do cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        // 🔥 BUSCAR DA REDE
        return fetch(request)
          .then(response => {
            // 🔥 SE É UMA IMAGEM OU ARQUIVO ESTÁTICO, CACHEAR
            if (response.ok && 
                (url.pathname.endsWith('.png') || 
                 url.pathname.endsWith('.jpg') || 
                 url.pathname.endsWith('.js') || 
                 url.pathname.endsWith('.css'))) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(error => {
            console.log(`❌ Erro na requisição: ${url.pathname}`, error);
            
            // 🔥 FALLBACKS ESPECÍFICOS
            if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) {
              return caches.match('https://i.imgur.com/SEr4lkm.png');
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' })
            });
          });
      })
  );
});

// 🔔 Atualização manual
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("⏭️ Pulando espera de atualização...");
    self.skipWaiting();
  }
});

// 🚨 Tratamento de erros globais
self.addEventListener('error', event => {
  console.error('🚨 Erro no Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('🚨 Promise rejeitada no Service Worker:', event.reason);
});
