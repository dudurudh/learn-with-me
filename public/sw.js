/* Hand-written rather than generated: the caching rules here are three lines of
   policy and a build plugin would bury them. */
const VERSION = new URL(self.location).searchParams.get('v') || 'dev'
const SHELL = `shell-${VERSION}`
const CONTENT = `content-${VERSION}`
const BASE = new URL('./', self.location).pathname

// The app shell plus the files the app is useless without.
const PRECACHE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}curriculum.json`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      // One bad URL must not stop the whole install, or the app never works offline.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: try the network so a deploy lands, fall back to the shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${BASE}index.html`)),
    )
    return
  }

  // Content that changes: news and the weekly diff. Fresh if possible, cached
  // if not, so an unreachable network shows yesterday rather than an error.
  if (url.pathname.endsWith('news.json') || url.pathname.endsWith('program-changes.json')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CONTENT).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  // Everything else — hashed assets, fonts, the curriculum — is immutable per
  // build, so cache first and fill in on first use.
  event.respondWith(
    caches.match(request).then((hit) =>
      hit ?? fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone()
          void caches.open(SHELL).then((c) => c.put(request, copy))
        }
        return res
      }),
    ),
  )
})
