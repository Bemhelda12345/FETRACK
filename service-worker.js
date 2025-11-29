// ElectriTrack Service Worker for Persistent Background Operation
const CACHE_NAME = 'electritrack-v40';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './consumption-fixed.js',
  './auth.js',
  './profile.js',
  './payment.js',
  './firebase-config.js',
  './analytics.js',
  './alerts.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for consumption data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'consumption-sync') {
    event.waitUntil(syncConsumptionData());
  }
  
  if (event.tag === 'trends-sync') {
    event.waitUntil(syncTrendsData());
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered');
  
  if (event.tag === 'consumption-periodic') {
    event.waitUntil(periodicConsumptionSync());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'ElectriTrack system update',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: './images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './images/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ElectriTrack', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Background consumption data sync
async function syncConsumptionData() {
  try {
    console.log('Service Worker: Syncing consumption data...');
    
    // Import Firebase modules (this would need to be adapted for service worker context)
    const response = await fetch('./api/sync-consumption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Service Worker: Consumption data synced successfully');
    } else {
      console.error('Service Worker: Failed to sync consumption data');
    }
  } catch (error) {
    console.error('Service Worker: Error syncing consumption data:', error);
  }
}

// Background trends data sync
async function syncTrendsData() {
  try {
    console.log('Service Worker: Syncing trends data...');
    
    const response = await fetch('./api/sync-trends', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Service Worker: Trends data synced successfully');
    } else {
      console.error('Service Worker: Failed to sync trends data');
    }
  } catch (error) {
    console.error('Service Worker: Error syncing trends data:', error);
  }
}

// Periodic consumption sync (runs every 15 minutes when supported)
async function periodicConsumptionSync() {
  try {
    console.log('Service Worker: Periodic consumption sync...');
    
    // Check if the app is currently open
    const clients = await self.clients.matchAll();
    const isAppOpen = clients.length > 0;
    
    if (!isAppOpen) {
      // App is closed, perform background sync
      await syncConsumptionData();
      await syncTrendsData();
      
      // Send notification if significant changes detected
      const shouldNotify = await checkForSignificantChanges();
      if (shouldNotify) {
        await self.registration.showNotification('ElectriTrack Update', {
          body: 'Your electricity consumption has been updated',
          icon: './icons/icon-192x192.png',
          tag: 'consumption-update'
        });
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in periodic sync:', error);
  }
}

// Check for significant consumption changes
async function checkForSignificantChanges() {
  try {
    // This would check stored consumption data for significant changes
    // For now, return false as a placeholder
    return false;
  } catch (error) {
    console.error('Service Worker: Error checking for changes:', error);
    return false;
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    // Trigger immediate sync
    syncConsumptionData();
    syncTrendsData();
  }
});
