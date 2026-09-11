// Service Worker — caché offline. App de un solo archivo, sin timers/notificaciones
// que cachear (a diferencia de Fit-F/Fit-M), así que esto es mucho más simple que
// esos sw.js: solo cachear los assets propios y servir la app sin conexión.
const CACHE = 'mate-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/favicon-32.png'
  // jszip/pdf.js NO se precachean: se cargan solo si el usuario suelta un
  // .pptx/.pdf en "Material de clase", y solo con conexión — ver index.html.
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

const OFFLINE_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;background:#1e2a52;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;color:#fff}
.card{background:rgba(255,255,255,.08);padding:36px 28px;border-radius:20px;text-align:center;
max-width:320px}h2{margin:0 0 10px;font-size:22px}p{margin:0;font-size:14px;opacity:.8;line-height:1.5}
</style></head><body><div class="card"><h2>Sin conexión</h2>
<p>Vuelve a intentarlo cuando tengas internet. Si ya abriste la app antes, algunas partes
pueden seguir funcionando.</p></div></body></html>`;

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (!url.startsWith(self.location.origin)) return;
  if (e.request.mode === 'navigate') {
    // Documento principal: red primero (para no quedarse pegado en una versión
    // vieja), con timeout corto y caché como respaldo — mismo patrón que Fit-F.
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    e.respondWith(
      Promise.race([fetch(e.request, { cache: 'no-cache' }), timeout]).then(res => {
        if (res && res.status === 200) {
          e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {}));
        }
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || new Response(
        OFFLINE_HTML, { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )))
    );
    return;
  }
  // Resto de assets: caché primero, red solo si falta.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200) {
        e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {}));
      }
      return res;
    }))
  );
});
