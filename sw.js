// Keeps only this small shell available offline, so the installed app opens to a clear
// "no connection" message instead of a browser error. The system itself always needs the network.
// It also shows the notifications the system sends (data-only Firebase messages: { title, body }).
const CACHE = 'ss-shell-v2';
const SHELL = ['./', 'manifest.webmanifest', 'logo.png', 'icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network first, so a new version of the shell is picked up as soon as it is published.
  e.respondWith(fetch(e.request)
    .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
});

self.addEventListener('push', e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch (err) { /* not JSON: show the default text */ }
  const d = msg.data || msg;
  // A push must always show something, or the phone treats the app as misbehaving.
  e.waitUntil(self.registration.showNotification(d.title || 'مدارس الأحد', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', lang: 'ar', dir: 'rtl'
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
