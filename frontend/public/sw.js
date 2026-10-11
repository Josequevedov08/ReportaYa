/*
 * Service Worker para ReportaYa PWA
 * - Funcionamiento offline
 * - Cache de assets estáticos
 * - Cache de datos de mapa
 */

const CACHE_NAME = 'reportaya-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
]

// Instalar y cachear assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

// Interceptar requests
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache first para assets estáticos
        if (response) {
          return response
        }

        // Network first para API calls
        return fetch(event.request)
          .then((response) => {
            // Cachear responses de API
            if (event.request.url.includes('/api/')) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache))
            }
            return response
          })
          .catch(() => {
            // Offline fallback
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html')
            }
          })
      })
  )
})

// Limpiar cachés viejas
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Manejar notificaciones push (si se implementan)
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  if (!data) return

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'reportaya-notification',
    data: {
      url: data.url || '/'
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Manejar click en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.openWindow(url)
  )
})
