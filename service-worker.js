const CACHE_NAME = "chit-manager-cache";
const urlsToCache = [
  "/ChitManager/",
  "/ChitManager/index.html",
  "/ChitManager/app.js",
  "/ChitManager/style.css",
  "/ChitManager/flatpickr/flatpickr.min.js",
  "/ChitManager/flatpickr/flatpickr.min.css",
  "/ChitManager/icons/chitManager512x512.png",
  "/ChitManager/icons/chitManager192x192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Fallback to index.html for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/ChitManager/index.html");
          }
        });
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
