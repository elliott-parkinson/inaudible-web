const CACHE_NAME = 'image-cache-v1';

// Cache all image requests
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle image requests
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse; // Serve from cache
          }

          // Otherwise, fetch from network and cache it
          return fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
      )
    );
  }
});
