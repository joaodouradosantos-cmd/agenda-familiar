/*
  Service Worker simples (offline-first)
  - Faz cache do App Shell e de assets estáticos.
  - Para navegação, tenta rede primeiro e cai para cache.
  - Para pedidos estáticos, cache-first.

  Nota: Next/Vercel já faz optimizações próprias; este SW mantém-se deliberadamente simples.
*/

const CACHE_NAME = "agenda-familiar-v1";

const CORE_ASSETS = [
  "/",
  "/tarefas",
  "/calendario",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navegação: rede primeiro, fallback para cache
  if (isNavigation(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }
      })()
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, res.clone());
        return res;
      } catch {
        return cached;
      }
    })()
  );
});
