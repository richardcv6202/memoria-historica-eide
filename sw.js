/* ============================================================
   Service Worker para PWA - EIDE "Fladio Álvarez Galán"
   Estrategia: Cache First con fallback a network
   Versión: 1.0.0
   ============================================================ */

const CACHE_NAME = 'eide-fladio-v1';
const OFFLINE_URL = '/offline.html';

// Archivos estáticos a cachear durante la instalación
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/admin.css',
  '/js/app.js',
  '/js/admin.js',
  '/admin/index.html'
];

// Extensiones de archivos multimedia
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const FONT_EXTENSIONS = ['woff', 'woff2', 'ttf', 'eot'];

// Helper: determinar si es un asset estático (css, js, html)
function isStaticAsset(url) {
  const staticPatterns = [
    '/css/', '/js/', '/manifest.json', '/index.html', '/admin/'
  ];
  return staticPatterns.some(pattern => url.includes(pattern));
}

// Helper: determinar si es una imagen
function isImage(url) {
  return IMAGE_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
}

// Helper: determinar si es un archivo de fuente
function isFont(url) {
  return FONT_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
}

// ──────────────────────────────────────────────────────────────
// INSTALL: cachear assets estáticos
// ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Error en instalación:', err))
  );
});

// ──────────────────────────────────────────────────────────────
// ACTIVATE: limpiar cachés viejos
// ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando caché antigua:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────────────────────
// FETCH: estrategia híbrida
// ──────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Excluir solicitudes no HTTP/HTTPS y analytics
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('analytics') || url.hostname.includes('google')) return;
  
  // Excluir solicitudes a la API de IndexedDB del admin
  if (url.pathname.includes('/resource/') && event.request.method === 'PUT') return;
  
  // Estrategia para navegación (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cachear la página recién obtenida
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Fallback offline: intentar servir desde caché
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          
          // Si no hay caché, mostrar página offline simple
          return new Response(
            '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EIDE Fladio - Sin conexión</title><style>body{font-family:"Barlow",sans-serif;text-align:center;padding:2rem;background:#0A1628;color:#fff;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center} h1{color:#F7C300;font-family:"Barlow Condensed",sans-serif;font-size:2rem} .logo{font-size:4rem;margin-bottom:1rem} a{color:#F7C300;text-decoration:none;margin-top:1rem;display:inline-block;padding:.5rem 1rem;border:2px solid #F7C300;border-radius:8px} a:hover{background:#F7C300;color:#0A1628}</style></head><body><div class="logo">🏅</div><h1>EIDE "Fladio Álvarez Galán"</h1><p>📡 Sin conexión a internet</p><p>La página que buscas no está disponible offline.</p><a href="/">↺ Volver al inicio</a></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }
  
  // Estrategia para assets estáticos (CSS, JS, HTML del admin)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Devuelve del caché, pero actualiza en background
            fetch(event.request)
              .then(response => {
                if (response.status === 200) {
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response);
                  });
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          return fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Estrategia para imágenes: caché first con fallback
  if (isImage(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Imagen placeholder para offline
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="background:#1a1a2e"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#666" font-size="40">📷</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }
  
  // Estrategia para fuentes: caché first
  if (isFont(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request)
            .then(response => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Por defecto: network first con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuesta exitosa
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // Si es una API o similar, devolver error 503
        if (event.request.headers.get('accept')?.includes('application/json')) {
          return new Response(JSON.stringify({ error: 'Offline - No hay conexión' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response('Recurso no disponible offline', { status: 503 });
      })
  );
});

// ──────────────────────────────────────────────────────────────
// NOTIFICACIONES PUSH (opcional - para futuras actualizaciones)
// ──────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva actualización disponible en el sitio',
    icon: '/resource/images/icon-192.png',
    badge: '/resource/images/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '🏅 EIDE Fladio Álvarez Galán', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// ──────────────────────────────────────────────────────────────
// MENSAJES DESDE LA PÁGINA PRINCIPAL
// ──────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});