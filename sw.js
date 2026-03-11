// Élev — Service Worker v2
const SW_VERSION = 'elev-sw-v2';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

let restTimerTimeout = null;

self.addEventListener('message', e => {
  const { type, payload } = e.data || {};

  if (type === 'START_REST_TIMER') {
    if (restTimerTimeout) { clearTimeout(restTimerTimeout); restTimerTimeout = null; }
    const { seconds, exName } = payload;

    restTimerTimeout = setTimeout(() => {
      restTimerTimeout = null;
      fireRestDone(exName || '');
    }, seconds * 1000);
  }

  if (type === 'CANCEL_REST_TIMER') {
    if (restTimerTimeout) { clearTimeout(restTimerTimeout); restTimerTimeout = null; }
  }
});

async function fireRestDone(exName) {
  // Toujours envoyer la notif — iOS la supprime automatiquement si l'app est au premier plan
  try {
    await self.registration.showNotification('Élev — Repos terminé 💪', {
      body: exName ? `C'est reparti sur ${exName} !` : "C'est reparti !",
      icon: '/elev/elev-icon.png',
      badge: '/elev/elev-icon.png',
      vibrate: [200, 100, 200, 100, 300],
      tag: 'rest-timer',
      renotify: true,
      requireInteraction: false,
      silent: false,
    });
  } catch(err) {
    console.warn('[SW] Notification échouée:', err);
  }

  // Envoie aussi un message à l'app si elle est ouverte (pour le beep)
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type: 'REST_DONE' }));
}

// Clic notif → focus l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const elevClient = clients.find(c => c.url.includes('elev'));
      if (elevClient) return elevClient.focus();
      return self.clients.openWindow('/elev/');
    })
  );
});
