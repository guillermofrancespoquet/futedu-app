// FUTEDU service worker: only needed so browsers offer to install the app. It never caches data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;   // everything else goes straight to the network
  e.respondWith(fetch(e.request).catch(() => new Response('You are offline. Reconnect to use FUTEDU.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
});
