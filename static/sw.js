const CACHE_NAME = 'tourist-rental-v1';
const urlsToCache = [
  '/'
];

// Don't cache manifest files and icons to ensure fresh PWA installs
const SKIP_CACHE_PATTERNS = [
  /manifest\.json/,
  /admin-manifest\.json/,
  /Capico.*\.png/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Skip cache for manifest files and icons
  const url = new URL(event.request.url);
  const shouldSkipCache = SKIP_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (shouldSkipCache) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});