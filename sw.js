/* Droplet Labs · Paths — offline service worker.
   Registered only after a visitor taps "Save all paths for offline" (see offline.js), so
   everyone else is untouched. Scope is the whole site, so it also serves every course,
   since each course is published under this same origin (/<repo>/).

   Strategy: files the visitor saved are served from the cache first (works in airplane mode)
   and quietly refreshed from the network when it is reachable. Anything not saved goes to the
   network as usual. */
const CACHE = 'dl-paths-offline-v1';
const FONTS = 'dl-paths-fonts-v1';
const KEEP = [CACHE, FONTS];
const SHELL = '/pwa-shell.js';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('dl-paths-') && !KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname === '/sw.js') return;
    e.respondWith(sameOrigin(e, req, url));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(fonts(req));
  }
});

const keyOf = (url) => url.origin + url.pathname;
const isCourse = (url) => url.pathname !== '/' && url.pathname !== '/index.html';

async function sameOrigin(e, req, url) {
  const nav = req.mode === 'navigate';
  try {
    const cache = await caches.open(CACHE);
    let hit = await cache.match(keyOf(url));
    if (!hit && url.pathname.endsWith('/')) hit = await cache.match(keyOf(url) + 'index.html');
    if (hit) {
      e.waitUntil(refresh(cache, req, keyOf(url), hit));
      return nav ? withShell(hit, url) : hit;
    }
  } catch (err) { /* fall through to the network */ }
  try {
    const res = await fetch(req);
    return nav ? withShell(res, url) : res;
  } catch (err) {
    if (nav) return offlinePage(url);
    return Response.error();
  }
}

/* Refresh a saved file in the background. Only a clean, same-kind response may replace it, so
   a captive Wi-Fi login page (a redirect, or HTML where a script was) can never overwrite it. */
async function refresh(cache, req, key, old) {
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (!res.ok || res.redirected || res.type !== 'basic') return;
    const a = (old.headers.get('content-type') || '').split(';')[0];
    const b = (res.headers.get('content-type') || '').split(';')[0];
    if (a && b && a !== b) return;
    await cache.put(key, res);
  } catch (err) { /* offline: keep what we have */ }
}

/* Course pages get one extra script: on an iPhone Home Screen app it keeps links inside the app
   and adds a small button back to all paths. In a normal browser tab it does nothing. */
async function withShell(res, url) {
  try {
    if (!isCourse(url)) return res;
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return res;
    const html = await res.clone().text();
    if (html.includes(SHELL)) return res;
    const out = html.replace(/<\/body>/i, `<script src="${SHELL}" defer></script></body>`);
    return new Response(out, { status: res.status, statusText: res.statusText, headers: res.headers });
  } catch (err) { return res; }
}

function offlinePage(url) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Offline · Droplet Labs Paths</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070B1C;color:#EEF0FA;font:16px/1.6 system-ui,-apple-system,sans-serif;padding:24px;box-sizing:border-box;text-align:center}
a{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:14px;background:#F2F2F0;color:#070B1C;text-decoration:none;font-weight:600}p{margin:6px 0;color:rgba(222,227,250,.75)}</style></head>
<body><div><h1 style="font-weight:500;margin:0 0 8px">You're offline</h1><p>This page wasn't saved for offline use.</p><p>这个页面没有存到离线副本里。</p><a href="/">All paths · 全部课程</a></div></body></html>`;
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function fonts(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && (res.type === 'cors' || res.type === 'basic')) cache.put(req.url, res.clone());
    return res;
  } catch (err) { return Response.error(); }
}
