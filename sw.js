// Hjertets Veje — minimalistisk service worker.
// Designet til at FALDE TILBAGE STILLE hvis noget går galt, så den
// aldrig blokerer siden fra at indlæse.

var CACHE = 'hjertets-veje-v2';

// Kun lokale assets pre-caches. Eksterne (CDN, fonts) caches on-demand
// så install ikke fejler hvis netværket har problemer med dem.
var PRECACHE = ['./', './index.html', './scenes.js', './manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // addAll fejler hvis én ressource ikke kan hentes — brug individuel
      // tilføjelse så install aldrig fejler totalt
      return Promise.all(PRECACHE.map(function(url) {
        return cache.add(url).catch(function() {});
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch-strategi: network-first, cache-fallback. Kun GET-requests cache.
self.addEventListener('fetch', function(e) {
  var req = e.request;
  // Ignorér non-GET (POST, osv.) og navigation-preloads
  if (req.method !== 'GET') return;
  // Ignorér cross-origin hvor caching kan fejle
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  e.respondWith(
    fetch(req).then(function(response) {
      // Cache kun same-origin, successful responses
      if (sameOrigin && response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(req, clone).catch(function() {});
        });
      }
      return response;
    }).catch(function() {
      // Offline: forsøg cache, eller lad browseren håndtere fejlen
      return caches.match(req).then(function(cached) {
        return cached || new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
