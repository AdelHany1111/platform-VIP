const CACHE_NAME = 'focus-empire-v1.5-cache';
const urlsToCache = [
  './',
  'manifest.json'
  // لا نحتاج لكتابة كل الروابط الخارجية هنا لأننا سنستخدم استراتيجية الكاش الديناميكي
];

// تنصيب الـ Service Worker وحفظ الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// تفعيل وتحديث الكاش إذا تغير الإصدار
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استراتيجية (Stale-While-Revalidate): جلب من الكاش لسرعة صاروخية، ثم التحديث من النت في الخلفية
self.addEventListener('fetch', event => {
  // تخطي الطلبات التي ليست GET (مثل POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // تحديث الكاش بالنسخة الجديدة من الإنترنت
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // في حالة انقطاع الإنترنت، يتم الاكتفاء بالنسخة المخزنة
        });

        // إرجاع النسخة المخزنة فوراً إن وجدت لسرعة فائقة، وإلا انتظر الرد من الإنترنت
        return cachedResponse || fetchPromise;
      })
  );
});