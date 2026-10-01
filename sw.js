const CACHE = 'soulchat-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && !k.endsWith('-img')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (/openrouter\.ai|googleapis\.com|supabase\.co|jsdelivr\.net/.test(url.host)) return;

  if (/pollinations\.ai|dicebear\.com/.test(url.host)) {
    e.respondWith(caches.open(CACHE + '-img').then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; }
      catch { return hit || Response.error(); }
    }));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

/* ───── Push ───── */
self.addEventListener('push', e => {
  let d = { title: 'SoulChat', body: 'มีข้อความใหม่' };
  try { d = e.data.json() } catch { if (e.data) d.body = e.data.text() }
  e.waitUntil(self.registration.showNotification(d.title || 'SoulChat', {
    body: d.body || '',
    icon: d.icon || './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || 'soulchat',
    renotify: true,
    data: d.data || {}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.charId;
  const url = './index.html' + (id ? '?c=' + id : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) {
      if ('focus' in w) { if (id) w.postMessage({ open: id }); return w.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
