// Service Worker v3 - clears old caches aggressively
const CACHE_NAME = 'exam-portal-v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

// Network-first: always try network, fall back to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return
  if (event.request.mode === 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
