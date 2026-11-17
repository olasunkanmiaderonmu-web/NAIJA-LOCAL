/* Naija Local service worker.
   - Pages and our own CSS/JS: network first (always fresh when online), cached copy when offline.
   - Library files from CDNs (Bootstrap, fonts): cached for speed.
   - NEVER touched: Supabase (login, database, photos), maps, place search, /api/ and /p/ routes.
   Change VERSION whenever you want every phone to throw away its old cache. */
const VERSION = 'nl-v3';
const SHELL = VERSION + '-shell', RUNTIME = VERSION + '-runtime';
const scope = self.registration.scope;
const abs = p => new URL(p, scope).href;
const PRECACHE = ['offline.html', 'css/style.css', 'js/app.js', 'js/config.js', 'js/location.js', 'icons/icon-192.png', 'manifest.webmanifest'].map(abs);
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

async function networkFirst(req, isNav){
  const cache = await caches.open(RUNTIME), url = new URL(req.url);
  const key = isNav ? url.origin + url.pathname : req;          // one cached copy per page, ignoring ?id=...
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(key)) || (await caches.match(req));
    if (hit) return hit;
    if (isNav) return (await caches.match(abs('offline.html'))) || Response.error();
    return Response.error();
  }
}
async function cdnCache(req){
  const cache = await caches.open(RUNTIME), hit = await cache.match(req.url);
  const refresh = fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' })).then(res => { if (res && res.ok) cache.put(req.url, res.clone()); return res; }).catch(() => null);
  return hit || (await refresh) || Response.error();
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (/\/(api|p)\//.test(url.pathname) || url.pathname.endsWith('/sitemap.xml') || url.pathname.endsWith('/sw.js')) return;
    e.respondWith(networkFirst(req, req.mode === 'navigate'));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(cdnCache(req));
  }
});