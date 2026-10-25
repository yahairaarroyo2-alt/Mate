// Service Worker — caché offline. App de un solo archivo, sin timers/notificaciones
// que cachear (a diferencia de Fit-F/Fit-M), así que esto es mucho más simple que
// esos sw.js: solo cachear los assets propios y servir la app sin conexión.
const CACHE = 'mate-v182';
const CACHE_FOTOS = 'mate-fotos-ayudante-v4';   // si cambias una foto de ayudante/, sube este número
// La app son DOS archivos: index.html (HTML + CSS) y app.js (todo el JavaScript). El ?v= de <script src="app.js?v=N"> en index.html
// es el MISMO número que CACHE: así una página nueva nunca corre con el JavaScript viejo. En cada deploy se suben los dos.
const APP_JS = './app.js?v=' + CACHE.split('-v')[1];
const NUCLEO = ['./index.html', APP_JS];   // sin esto la app no abre sin internet: si no se pueden guardar, la instalación falla y se queda la versión anterior (completa)
const ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/favicon-32.png'
  // jszip/pdf.js NO se precachean: se cargan solo si el usuario suelta un
  // .pptx/.pdf en "Material de clase", y solo con conexión — ver app.js.
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all([
      ...NUCLEO.map(a => c.add(new Request(a, { cache: 'reload' }))),
      ...ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {}))
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('mate-') && k !== CACHE && k !== CACHE_FOTOS).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Colores igualados al tema gris-lavanda de la app (no al azul viejo de antes del rediseño
// "vidrio esmerilado", commit cfd47a5). Esta página no puede leer mate_tema_v1 — la sirve el
// SW, no corre el JS de la app — así que usa @media (única excepción a la regla de "nunca
// @media, siempre body.night" de index.html, que sí puede leer la preferencia manual).
const OFFLINE_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;
background:linear-gradient(145deg,#c8c8d0 0%,#d8d8e0 50%,#c8c8d0 100%);display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;color:#1a1a2e}
.card{background:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.7);padding:36px 28px;
border-radius:20px;text-align:center;max-width:320px}
h2{margin:0 0 10px;font-size:22px}p{margin:0;font-size:14px;opacity:.75;line-height:1.5}
@media (prefers-color-scheme:dark){body{background:#000;color:#f5f5f7}
.card{background:rgba(28,28,30,.72);border-color:rgba(255,255,255,.12)}}
</style></head><body><div class="card"><h2>Sin conexión</h2>
<p>Vuelve a intentarlo cuando tengas internet. Si ya abriste la app antes, algunas partes
pueden seguir funcionando.</p></div></body></html>`;

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    // Abrir la app (con o sin ?test / ?practica=…): se sirve AL INSTANTE la copia guardada, sin esperar
    // al internet (antes esperaba hasta 4 s cada vez). En segundo plano se baja la versión nueva para
    // la próxima vez; cuando se publica una versión (sube CACHE) el SW nuevo recarga la app solo.
    const esLaApp = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    if (!esLaApp) return;
    // la copia guardada solo se reescribe si la del servidor es otra (mismo ETag = la misma página: antes se volvía a escribir en el disco en CADA apertura)
    const red = fetch(url.origin + url.pathname, { cache: 'no-cache' }).then(async res => {
      if (res && res.status === 200) {
        const c = await caches.open(CACHE), vieja = await c.match('./index.html');
        const et = res.headers.get('etag');
        if (!(vieja && et && vieja.headers.get('etag') === et)) await c.put('./index.html', res.clone());
      }
      return res;
    });
    e.waitUntil(red.catch(() => {}));
    e.respondWith(caches.match('./index.html', { cacheName: CACHE }).then(cached => cached || red.catch(() =>
      new Response(OFFLINE_HTML, { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )));
    return;
  }
  // Resto de assets: caché primero, red solo si falta. Las fotos de "Repaso de ayudante"
  // (~6 MB) van a su propia caché, que NO se borra al subir de versión: no se bajan otra vez.
  const cache = url.pathname.includes('/ayudante/') ? CACHE_FOTOS : CACHE;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const copia = res.clone();
        e.waitUntil(caches.open(cache).then(c => c.put(e.request, copia)).catch(() => {}));
      }
      return res;
    }))
  );
});
